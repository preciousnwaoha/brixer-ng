-- Additive upgrade: an order remains one independently fulfilled service instance.
create table public.services (
  code text primary key,
  definition jsonb not null,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  check (definition->>'code' = code),
  check ((definition->>'priceKobo')::bigint > 0)
);
create unique index services_slug_idx on public.services ((definition->>'slug'));
create table public.service_options (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('bank', 'hard_copy', 'delivery')),
  label text not null,
  description text not null default '',
  available boolean not null default true,
  unique(kind, label)
);
insert into public.service_options(kind,label) values ('bank','FCMB'),('bank','First Bank'),('bank','Zenith Bank'),('bank','Keystone Bank');
-- Hard-copy/delivery options are enabled by the owner once actually offered.

create table public.checkouts (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  idempotency_key uuid not null unique,
  request_digest text not null,
  customer_email text not null,
  total_kobo bigint not null,
  due_now_kobo bigint not null,
  payment_plan public.payment_plan not null,
  created_at timestamptz not null default now()
);
alter table public.orders add column checkout_id uuid references public.checkouts(id);
alter table public.orders add column service_snapshot jsonb;
create index orders_checkout_idx on public.orders(checkout_id);
alter table public.payments alter column order_id drop not null;
alter table public.payments add column checkout_id uuid references public.checkouts(id);
alter table public.payments add column authorization_url text;
create table public.payment_allocations (
  payment_id uuid not null references public.payments(id),
  order_id uuid not null references public.orders(id),
  amount_kobo bigint not null check (amount_kobo > 0),
  primary key(payment_id,order_id)
);
insert into public.checkouts(id,reference,idempotency_key,request_digest,customer_email,total_kobo,due_now_kobo,payment_plan)
select id,reference,id,'legacy',customer_email,total_kobo,
  case when payment_plan = 'installment' then (total_kobo+1)/2 else total_kobo end,payment_plan from public.orders;
update public.orders set checkout_id = id;
update public.payments p set checkout_id = o.checkout_id from public.orders o where o.id = p.order_id;
insert into public.payment_allocations(payment_id,order_id,amount_kobo) select id,order_id,expected_kobo from public.payments;

create table public.information_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  label text not null,
  description text not null default '',
  input_type text not null check(input_type in ('text','file')),
  status text not null default 'pending' check(status in ('pending','submitted','resolved')),
  response text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.fulfillment_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  hard_copy_option_id uuid references public.service_options(id),
  delivery_option_id uuid references public.service_options(id),
  options_snapshot jsonb not null,
  address text not null default '',
  notes text not null default '',
  status text not null default 'requested' check(status in ('requested','quoted','paid','fulfilled','cancelled')),
  quote_kobo bigint check(quote_kobo > 0),
  quote_note text,
  quote_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.fulfillment_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.fulfillment_requests(id),
  version integer not null,
  amount_kobo bigint not null check(amount_kobo > 0),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(request_id,version)
);
alter table public.payments add column fulfillment_request_id uuid references public.fulfillment_requests(id);
alter table public.payments add column quote_version integer;
alter table public.documents add column information_request_id uuid references public.information_requests(id);
create table public.upload_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  uploaded_by uuid not null references public.profiles(id),
  kind text not null check(kind in ('application','completed','banking')),
  field_id text,
  information_request_id uuid references public.information_requests(id),
  object_key text not null unique,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null,
  finalized_at timestamptz,
  expires_at timestamptz not null default now() + interval '10 minutes'
);
alter table public.notifications add column event_key text unique;
create unique index notification_channel_idx on public.notification_deliveries(notification_id,channel);
alter table public.notification_deliveries add column provider_status text;
alter table public.profiles add column phone_verified_at timestamptz;
create table public.auth_rate_limits (key text primary key, attempts integer not null, window_start timestamptz not null);

create function public.auth_attempt(p_key text, p_limit integer default 5) returns boolean
language plpgsql security definer set search_path=public as $$
declare n integer;
begin
  insert into public.auth_rate_limits(key,attempts,window_start) values(p_key,1,now())
  on conflict(key) do update set attempts=case when auth_rate_limits.window_start < now()-interval '15 minutes' then 1 else auth_rate_limits.attempts+1 end,
    window_start=case when auth_rate_limits.window_start < now()-interval '15 minutes' then now() else auth_rate_limits.window_start end
  returning attempts into n;
  return n <= p_limit;
end $$;
create function public.auth_methods(p_email text default null,p_phone text default null) returns jsonb
language sql security definer set search_path=public as $$
  select jsonb_build_object('exists',true,'hasPassword',coalesce(encrypted_password,'') <> '', 'emailVerified',email_confirmed_at is not null)
  from auth.users where (p_email is not null and lower(email)=lower(p_email)) or
  (p_phone is not null and ltrim(phone,'+')=ltrim(p_phone,'+') and phone_confirmed_at is not null) limit 1
$$;

create function public.queue_order_notification(p_order_id uuid,p_event text,p_title text,p_body text,p_key text) returns uuid
language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; n uuid;
begin
  select * into o from public.orders where id=p_order_id;
  insert into public.notifications(user_id,order_id,event_type,title,body,event_key)
  values(o.user_id,o.id,p_event,p_title,p_body,p_key) on conflict(event_key) do nothing returning id into n;
  if n is null then select id into n from public.notifications where event_key=p_key; return n; end if;
  insert into public.notification_deliveries(notification_id,channel,destination,template_key,payload)
  values(n,'email',o.customer_email,p_event,jsonb_build_object('subject',p_title,'body',p_body));
  if o.whatsapp_consent then
    insert into public.notification_deliveries(notification_id,channel,destination,template_key,payload)
    values(n,'whatsapp',o.customer_phone,'brixer_order_update',jsonb_build_object('subject',p_title,'body',p_body));
  end if;
  return n;
end $$;

-- Input is assembled and priced by the trusted application; DB rechecks catalogue prices.
create function public.create_checkout(p_id uuid,p_reference text,p_key uuid,p_digest text,p_contact jsonb,p_plan public.payment_plan,p_items jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.checkouts%rowtype; previous_payment public.payments%rowtype; s jsonb; item jsonb; unit_price bigint; due bigint; total bigint:=0; charge bigint:=0;
  oid uuid; pid uuid; idx integer:=0; q integer; ord_plan public.payment_plan;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  select * into c from public.checkouts where idempotency_key=p_key;
  if found then
    if c.request_digest <> p_digest then raise exception 'Checkout details changed; please review and try again'; end if;
    select * into previous_payment from public.payments p where p.checkout_id=c.id and p.kind<>'balance' and p.fulfillment_request_id is null order by p.created_at desc,p.id desc limit 1;
    if previous_payment.status='failed' then
      insert into public.payments(checkout_id,reference,kind,expected_kobo,created_at) values(c.id,p_reference,previous_payment.kind,previous_payment.expected_kobo,clock_timestamp()) returning id into pid;
      insert into public.payment_allocations(payment_id,order_id,amount_kobo) select pid,a.order_id,a.amount_kobo from public.payment_allocations a where a.payment_id=previous_payment.id;
      return jsonb_build_object('checkoutId',c.id,'reference',p_reference,'orderReference',c.reference,'amount',previous_payment.expected_kobo,'authorizationUrl',null,'status','initialized');
    end if;
    return jsonb_build_object('checkoutId',c.id,'reference',previous_payment.reference,'orderReference',c.reference,'amount',previous_payment.expected_kobo,'authorizationUrl',previous_payment.authorization_url,'status',previous_payment.status);
  end if;
  if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>50 then raise exception 'Invalid cart'; end if;
  insert into public.checkouts(id,reference,idempotency_key,request_digest,customer_email,total_kobo,due_now_kobo,payment_plan)
  values(p_id,p_reference,p_key,p_digest,lower(p_contact->>'email'),0,0,p_plan);
  insert into public.payments(reference,checkout_id,kind,expected_kobo) values(p_reference,p_id,case when p_plan='installment' then 'deposit'::public.payment_kind else 'full'::public.payment_kind end,1) returning id into pid;
  for item in select value from jsonb_array_elements(p_items) loop
    select definition into s from public.services where code=item->>'serviceCode';
    if s is null or not (s->>'available')::boolean then raise exception 'A service is unavailable'; end if;
    unit_price:=(s->>'priceKobo')::bigint; q:=(item->>'quantity')::integer;
    if q<1 or q>20 then raise exception 'Invalid quantity'; end if;
    if (item->>'priceKobo')::bigint<>unit_price then raise exception 'Service price changed; please review your cart'; end if;
    ord_plan:=case when p_plan='installment' and (s->>'installmentEligible')::boolean and unit_price>=1000000 then 'installment'::public.payment_plan else 'full'::public.payment_plan end;
    due:=case when ord_plan='installment' then (unit_price+1)/2 else unit_price end;
    if item ? 'dueNowKobo' and (item->>'dueNowKobo')::bigint<>due then raise exception 'Payment eligibility changed; please review your cart'; end if;
    for j in 1..q loop
      idx:=idx+1; if idx>50 then raise exception 'Too many items'; end if;
      insert into public.orders(reference,checkout_id,service_code,service_snapshot,customer_name,customer_email,customer_phone,total_kobo,payment_plan,referral_code_used,whatsapp_consent)
      values(p_reference||'-'||lpad(idx::text,2,'0'),p_id,s->>'code',s,p_contact->>'fullName',lower(p_contact->>'email'),p_contact->>'phone',unit_price,ord_plan,nullif(p_contact->>'referralCode',''),coalesce((p_contact->>'whatsappConsent')::boolean,false)) returning id into oid;
      insert into public.payment_allocations values(pid,oid,due);
      total:=total+unit_price; charge:=charge+due;
    end loop;
  end loop;
  update public.checkouts set total_kobo=total,due_now_kobo=charge where id=p_id;
  update public.payments set expected_kobo=charge,kind=case when charge=total then 'full'::public.payment_kind else 'deposit'::public.payment_kind end where id=pid;
  return jsonb_build_object('checkoutId',p_id,'reference',p_reference,'amount',charge,'authorizationUrl',null,'status','initialized');
end $$;

create function public.prepare_balance(p_order_id uuid,p_reference text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; p public.payments%rowtype; due bigint;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  due:=o.total_kobo-o.paid_kobo;
  if due<=0 or o.payment_state='pending' then raise exception 'This item has no payable balance'; end if;
  select * into p from public.payments where order_id=o.id and kind='balance' and status in ('initialized','pending') order by created_at desc limit 1;
  if not found then
    insert into public.payments(order_id,checkout_id,reference,kind,expected_kobo) values(o.id,o.checkout_id,p_reference,'balance',due) returning * into p;
    insert into public.payment_allocations values(p.id,o.id,due);
  end if;
  return jsonb_build_object('reference',p.reference,'amount',p.expected_kobo,'authorizationUrl',p.authorization_url,'checkoutId',o.checkout_id,'orderReference',o.reference,'email',o.customer_email);
end $$;

create or replace function public.fulfill_payment(p_reference text,p_amount_kobo bigint,p_provider_id text,p_payload jsonb)
returns table(order_id uuid,order_reference text,customer_email text,customer_name text,needs_claim boolean,claim_sent_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare p public.payments%rowtype; a record; o public.orders%rowtype; f public.fulfillment_requests%rowtype;
begin
  select * into p from public.payments where reference=p_reference for update;
  if not found or p.expected_kobo<>p_amount_kobo then raise exception 'Unknown payment or amount mismatch'; end if;
  if p.status='reversed' then raise exception 'This payment was reversed'; end if;
  if p.status<>'succeeded' then
    if p.fulfillment_request_id is not null then
      select * into f from public.fulfillment_requests where id=p.fulfillment_request_id for update;
      if f.quote_version<>p.quote_version or f.quote_kobo<>p_amount_kobo or f.status<>'quoted' then raise exception 'Quote is no longer payable'; end if;
      update public.fulfillment_requests set status='paid',updated_at=now() where id=f.id;
      perform public.queue_order_notification(f.order_id,'fulfillment_paid','Delivery payment confirmed','Your hard-copy or delivery payment has been confirmed.','payment:'||p.id);
    else
      if (select sum(amount_kobo) from public.payment_allocations where payment_id=p.id) is distinct from p_amount_kobo then raise exception 'Payment allocation mismatch'; end if;
      for a in select * from public.payment_allocations where payment_id=p.id order by order_id loop
        select * into o from public.orders where id=a.order_id for update;
        if o.paid_kobo+a.amount_kobo>o.total_kobo then raise exception 'Payment exceeds item balance; administrator review required'; end if;
        update public.orders set paid_kobo=paid_kobo+a.amount_kobo,payment_state=case when paid_kobo+a.amount_kobo>=total_kobo then 'paid'::public.payment_state else 'deposit_paid'::public.payment_state end where id=o.id;
        insert into public.applications(order_id) values(o.id) on conflict do nothing;
        if o.service_snapshot->>'category' in ('cac','banking') and not exists(select 1 from public.bank_requests where bank_requests.order_id=o.id) then
          insert into public.bank_requests(order_id,included_with_cac) values(o.id,o.service_snapshot->>'category'='cac');
        end if;
        -- One receipt per checkout payment, one per balance payment.
        if o.id=(select min(pa.order_id::text)::uuid from public.payment_allocations pa where pa.payment_id=p.id) then
          perform public.queue_order_notification(o.id,'payment_confirmed','Payment confirmed','We have received your payment. Our team will call you. Log in to complete the service details and follow progress.','payment:'||p.id);
        end if;
        if o.paid_kobo+a.amount_kobo>=o.total_kobo and o.referral_code_used is not null then
          insert into public.referral_ledger(referrer_id,order_id,reward_kobo,status,available_at)
          select rc.user_id,o.id,(o.service_snapshot->>'referralRewardKobo')::bigint,'available',now() from public.referral_codes rc
          join auth.users u on u.id=rc.user_id where upper(rc.code)=upper(o.referral_code_used) and lower(u.email)<>lower(o.customer_email)
          on conflict do nothing;
        end if;
      end loop;
    end if;
    update public.payments set status='succeeded',verified_kobo=p_amount_kobo,provider_id=p_provider_id,provider_payload=p_payload,verified_at=now() where id=p.id;
  end if;
  if p.fulfillment_request_id is not null then select * into o from public.orders where id=(select fr.order_id from public.fulfillment_requests fr where fr.id=p.fulfillment_request_id);
  else select * into o from public.orders where id=(select pa.order_id from public.payment_allocations pa where pa.payment_id=p.id order by pa.order_id limit 1); end if;
  return query select o.id,coalesce((select c.reference from public.checkouts c where c.id=p.checkout_id),o.reference),o.customer_email,o.customer_name,false,null::timestamptz;
end $$;

create function public.attach_guest_orders() returns void language plpgsql security definer set search_path=public as $$
declare verified_email text;
begin
  select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if verified_email is null then raise exception 'Verify your email to access your orders'; end if;
  update public.orders set user_id=auth.uid() where user_id is null and lower(customer_email)=verified_email and payment_state in ('paid','deposit_paid');
  update public.notifications n set user_id=auth.uid() from public.orders o where n.order_id=o.id and o.user_id=auth.uid() and n.user_id is null;
end $$;

create or replace function public.advance_order_stage(p_order_id uuid,p_stage public.order_stage,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; allowed boolean;
begin
  if coalesce(public.current_role()::text,'') not in ('admin','staff') then raise exception 'Staff access required'; end if;
  select * into o from public.orders where id=p_order_id for update;
  if not found or (public.current_role()='staff' and o.assigned_staff_id is distinct from auth.uid()) then raise exception 'Item is not assigned to this account'; end if;
  if o.payment_state not in ('paid','deposit_paid') then raise exception 'Initial payment is required'; end if;
  if o.stage=p_stage then return; end if;
  allowed:=(o.stage='received' and p_stage='filing') or (o.stage='filing' and p_stage='submitted') or (o.stage='submitted' and p_stage='processing') or (o.stage='processing' and p_stage='completed');
  if not allowed and public.current_role()<>'admin' then raise exception 'Invalid stage transition'; end if;
  if p_stage='completed' and not exists(select 1 from public.documents d where d.order_id=o.id and d.kind in ('completed','banking')) then raise exception 'Upload the resulting documents before completing this item'; end if;
  insert into public.order_stage_events(order_id,from_stage,to_stage,note,created_by) values(o.id,o.stage,p_stage,p_note,auth.uid());
  update public.orders set stage=p_stage,is_paused=false,pause_reason=null,completed_at=case when p_stage='completed' then now() else null end where id=o.id;
  if p_stage='completed' then
    update public.documents set released_at=now() where documents.order_id=o.id and kind in ('completed','banking');
    if o.assigned_staff_id is not null then insert into public.staff_earnings(staff_id,order_id,amount_kobo,status)
      values(o.assigned_staff_id,o.id,round(o.total_kobo*coalesce((o.service_snapshot->>'staffRate')::numeric,5)/100),'available') on conflict do nothing; end if;
  end if;
  perform public.queue_order_notification(o.id,'stage_'||p_stage,case when p_stage='completed' then 'Your documents are ready' else 'Service progress update' end,
    coalesce(o.service_snapshot->>'name',o.service_code)||' ('||o.reference||'): '||p_stage||case when p_stage='completed' and o.paid_kobo<o.total_kobo then '. Settle this item’s balance to download the documents.' else '. Visit your dashboard for details.' end,
    'stage:'||o.id||':'||(select max(id) from public.order_stage_events where order_id=o.id));
end $$;

create function public.change_information_request(p_id uuid,p_order_id uuid,p_label text,p_description text,p_type text,p_status text default null,p_response text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; r public.information_requests%rowtype; rid uuid;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'Item not found'; end if;
  if o.payment_state not in ('paid','deposit_paid') then raise exception 'Initial payment is required'; end if;
  if p_id is null then
    if public.current_role() is distinct from 'admin' then raise exception 'Admin access required'; end if;
    insert into public.information_requests(order_id,label,description,input_type,created_by) values(o.id,p_label,coalesce(p_description,''),p_type,auth.uid()) returning id into rid;
    perform public.queue_order_notification(o.id,'information_requested','Information needed',p_label||': '||p_description,'information:'||rid);
  else
    select * into r from public.information_requests where id=p_id and order_id=o.id for update;
    if not found then raise exception 'Request not found'; end if;
    rid:=r.id;
    if public.current_role()='admin' then
      if p_status not in ('pending','resolved') then raise exception 'Invalid status'; end if;
      update public.information_requests set status=p_status,description=coalesce(p_description,description),updated_at=now() where id=rid;
      if p_status='pending' then perform public.queue_order_notification(o.id,'information_requested','More information needed',r.label||': '||coalesce(p_description,r.description),'information:'||rid||':'||clock_timestamp()); end if;
    elsif o.user_id=auth.uid() then
      if r.status='resolved' then raise exception 'This request has already been resolved'; end if;
      if r.input_type='file' and not exists(select 1 from public.documents where information_request_id=rid and kind='application') then raise exception 'Upload the requested file first'; end if;
      if r.input_type='text' and length(trim(coalesce(p_response,'')))=0 then raise exception 'Enter the requested information'; end if;
      update public.information_requests set response=p_response,status='submitted',updated_at=now() where id=rid;
    else raise exception 'Access denied'; end if;
  end if;
  return rid;
end $$;

create function public.set_fulfillment_quote(p_id uuid,p_amount bigint,p_note text,p_fulfilled boolean default false) returns void
language plpgsql security definer set search_path=public as $$
declare f public.fulfillment_requests%rowtype;
begin
  if public.current_role() is distinct from 'admin' then raise exception 'Admin access required'; end if;
  select * into f from public.fulfillment_requests where id=p_id for update;
  if not found then raise exception 'Request not found'; end if;
  if p_fulfilled then
    if f.status<>'paid' then raise exception 'Payment is required before fulfillment'; end if;
    update public.fulfillment_requests set status='fulfilled',updated_at=now() where id=f.id;
    perform public.queue_order_notification(f.order_id,'fulfilled','Delivery update',coalesce(p_note,'Your request has been fulfilled.'),'fulfillment:'||f.id||':done');
  else
    if f.status not in ('requested','quoted') or p_amount<=0 then raise exception 'This request cannot be quoted'; end if;
    if exists(select 1 from public.payments where fulfillment_request_id=f.id and status in ('initialized','pending','succeeded')) then raise exception 'A payment has already started for this quote'; end if;
    insert into public.fulfillment_quotes(request_id,version,amount_kobo,note,created_by) values(f.id,f.quote_version+1,p_amount,p_note,auth.uid());
    update public.fulfillment_requests set quote_kobo=p_amount,quote_note=p_note,quote_version=quote_version+1,status='quoted',updated_at=now() where id=f.id;
    perform public.queue_order_notification(f.order_id,'fulfillment_quoted','Your delivery quote is ready','Review and pay the quote in your dashboard. '||coalesce(p_note,''),'fulfillment:'||f.id||':quote:'||(f.quote_version+1));
  end if;
end $$;

create function public.prepare_fulfillment_payment(p_id uuid,p_version integer,p_reference text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare f public.fulfillment_requests%rowtype; p public.payments%rowtype; o public.orders%rowtype;
begin
  select * into f from public.fulfillment_requests where id=p_id for update;
  if not found or f.status<>'quoted' or f.quote_version<>p_version then raise exception 'This quote has changed or is no longer payable'; end if;
  select * into o from public.orders where id=f.order_id;
  select * into p from public.payments where fulfillment_request_id=f.id and status in ('initialized','pending') order by created_at desc limit 1;
  if not found then insert into public.payments(order_id,checkout_id,fulfillment_request_id,quote_version,reference,kind,expected_kobo)
    values(o.id,o.checkout_id,f.id,f.quote_version,p_reference,'full',f.quote_kobo) returning * into p; end if;
  return jsonb_build_object('reference',p.reference,'amount',p.expected_kobo,'authorizationUrl',p.authorization_url,'orderReference',o.reference,'email',o.customer_email);
end $$;

-- Every protected write is checked in a route/RPC; clients cannot forge document metadata.
drop policy "clients insert own document metadata" on public.documents;
drop policy "clients manage own applications" on public.applications;
create policy "clients read applications" on public.applications for select using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
drop policy "clients view own payments" on public.payments;
create policy "authorized payments" on public.payments for select using(public.current_role()='admin' or exists(select 1 from public.payment_allocations a join public.orders o on o.id=a.order_id where a.payment_id=payments.id and o.user_id=auth.uid()) or exists(select 1 from public.orders o where o.id=payments.order_id and o.user_id=auth.uid()));
alter table public.services enable row level security;
alter table public.service_options enable row level security;
alter table public.checkouts enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.information_requests enable row level security;
alter table public.fulfillment_requests enable row level security;
alter table public.fulfillment_quotes enable row level security;
alter table public.upload_intents enable row level security;
alter table public.auth_rate_limits enable row level security;
create policy "read services" on public.services for select using(true);
create policy "admin services" on public.services for all using(public.current_role()='admin') with check(public.current_role()='admin');
create policy "read service options" on public.service_options for select using(true);
create policy "admin service options" on public.service_options for all using(public.current_role()='admin') with check(public.current_role()='admin');
create policy "read checkouts" on public.checkouts for select using(public.current_role()='admin' or exists(select 1 from public.orders o where o.checkout_id=checkouts.id and o.user_id=auth.uid()));
create policy "read allocations" on public.payment_allocations for select using(public.current_role()='admin' or exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
create policy "read information requests" on public.information_requests for select using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or o.assigned_staff_id=auth.uid() or public.current_role()='admin')));
create policy "read fulfillment requests" on public.fulfillment_requests for select using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.current_role()='admin')));
create policy "read quotes" on public.fulfillment_quotes for select using(exists(select 1 from public.fulfillment_requests f join public.orders o on o.id=f.order_id where f.id=request_id and (o.user_id=auth.uid() or public.current_role()='admin')));
create policy "admins view deliveries" on public.notification_deliveries for select using(public.current_role()='admin');

revoke all on function public.auth_attempt(text,integer),public.auth_methods(text,text),public.queue_order_notification(uuid,text,text,text,text),public.create_checkout(uuid,text,uuid,text,jsonb,public.payment_plan,jsonb),public.prepare_balance(uuid,text),public.prepare_fulfillment_payment(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.auth_attempt(text,integer),public.auth_methods(text,text),public.queue_order_notification(uuid,text,text,text,text),public.create_checkout(uuid,text,uuid,text,jsonb,public.payment_plan,jsonb),public.prepare_balance(uuid,text),public.prepare_fulfillment_payment(uuid,integer,text),public.fulfill_payment(text,bigint,text,jsonb) to service_role;
revoke all on function public.attach_guest_orders(),public.advance_order_stage(uuid,public.order_stage,text),public.change_information_request(uuid,uuid,text,text,text,text,text),public.set_fulfillment_quote(uuid,bigint,text,boolean),public.pickup_job(text),public.flag_order_delay(text,text) from public,anon;
grant execute on function public.attach_guest_orders(),public.change_information_request(uuid,uuid,text,text,text,text,text),public.set_fulfillment_quote(uuid,bigint,text,boolean) to authenticated;
-- Legacy claim tokens are no longer an authorization mechanism.
revoke execute on function public.claim_order(uuid,text,text) from public,anon,authenticated;

create function public.finalize_upload(p_upload_id uuid,p_user_id uuid,p_key text,p_etag text) returns uuid
language plpgsql security definer set search_path=public as $$
declare u public.upload_intents%rowtype; o public.orders%rowtype; doc uuid;
begin
  select * into u from public.upload_intents where id=p_upload_id and uploaded_by=p_user_id for update;
  if not found then raise exception 'Upload authorization not found'; end if;
  if u.finalized_at is not null then select id into doc from public.documents where object_key=p_key; return doc; end if;
  if u.expires_at<now() then raise exception 'Upload authorization expired'; end if;
  select * into o from public.orders where id=u.order_id;
  insert into public.documents(order_id,owner_id,uploaded_by,kind,field_id,information_request_id,object_key,file_name,content_type,size_bytes,etag,released_at)
  values(o.id,o.user_id,u.uploaded_by,u.kind,u.field_id,u.information_request_id,p_key,u.file_name,u.content_type,u.size_bytes,p_etag,case when u.kind<>'application' and o.stage='completed' then now() end) returning id into doc;
  update public.upload_intents set finalized_at=now() where id=u.id;
  if u.kind<>'application' and o.stage='completed' then perform public.queue_order_notification(o.id,'documents_added','New documents are ready','Additional documents are available in your service item. Any outstanding service balance must be settled before downloading.','document:'||doc); end if;
  return doc;
end $$;
revoke all on function public.finalize_upload(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finalize_upload(uuid,uuid,text,text) to service_role;

create or replace function public.pickup_job(p_order_reference text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if coalesce(public.current_role()::text,'') not in ('staff','admin') then raise exception 'Staff access required'; end if;
  update public.orders set assigned_staff_id=auth.uid() where reference=p_order_reference and assigned_staff_id is null and stage='received' and payment_state in ('paid','deposit_paid');
  if not found then raise exception 'This job is no longer available'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'job_picked_up','order',p_order_reference);
end $$;
create or replace function public.flag_order_delay(p_order_reference text,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype;
begin
  if coalesce(public.current_role()::text,'') not in ('staff','admin') then raise exception 'Staff access required'; end if;
  select * into o from public.orders where reference=p_order_reference for update;
  if not found or (public.current_role()='staff' and o.assigned_staff_id is distinct from auth.uid()) then raise exception 'Item is not assigned to this account'; end if;
  if length(trim(p_reason))<3 then raise exception 'Explain the delay'; end if;
  update public.orders set is_paused=true,pause_reason=p_reason where id=o.id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'order_delay_flagged','order',o.id,jsonb_build_object('reason',p_reason));
  perform public.queue_order_notification(o.id,'delay','A service update from our team',p_reason,'delay:'||o.id||':'||clock_timestamp());
end $$;

create function public.record_whatsapp_status(p_provider_id text,p_status text,p_error text) returns void
language plpgsql security definer set search_path=public as $$
begin
  -- Ignore out-of-order delivery callbacks after an already-read message.
  update public.notification_deliveries set provider_status=p_status,
    status=case when p_status='failed' then 'failed' else status end,
    last_error=case when p_status='failed' then p_error else last_error end
  where provider_id=p_provider_id and channel='whatsapp' and
    (provider_status is null or provider_status='sent' or (provider_status='delivered' and p_status='read'));
end $$;
revoke all on function public.record_whatsapp_status(text,text,text) from public,anon,authenticated;
grant execute on function public.record_whatsapp_status(text,text,text) to service_role;
