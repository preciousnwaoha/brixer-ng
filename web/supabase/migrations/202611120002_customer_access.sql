alter table public.checkouts add column buyer_id uuid references public.profiles(id) on delete restrict;
create index checkouts_buyer_idx on public.checkouts(buyer_id);
create table public.order_access_grants (
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(order_id,user_id)
);
alter table public.order_access_grants enable row level security;
create policy "customers read own grants" on public.order_access_grants for select using(user_id=auth.uid() or public.current_role()='admin');

create function public.customer_order_access(p_order_id uuid,p_user_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select p_user_id is not null and exists(select 1 from public.orders o where o.id=p_order_id and
    (o.user_id=p_user_id or exists(select 1 from public.order_access_grants g where g.order_id=o.id and g.user_id=p_user_id)))
$$;
revoke all on function public.customer_order_access(uuid,uuid) from public,anon,authenticated;
grant execute on function public.customer_order_access(uuid,uuid) to service_role;
create function public.can_access_customer_order(p_order_id uuid) returns boolean
language sql stable security definer set search_path=public as $$ select public.customer_order_access(p_order_id,auth.uid()) $$;
revoke all on function public.can_access_customer_order(uuid) from public,anon;
grant execute on function public.can_access_customer_order(uuid) to authenticated;

create or replace function public.attach_guest_orders() returns void language plpgsql security definer set search_path=public as $$
declare verified_email text; verified_phone text;
begin
  if auth.uid() is null or public.current_role() is distinct from 'client' then raise exception 'Client login required'; end if;
  select case when email_confirmed_at is not null then lower(email) end,
    case when phone_confirmed_at is not null then regexp_replace(phone,'[^0-9]','','g') end
  into verified_email,verified_phone from auth.users where id=auth.uid();
  if verified_email is null and verified_phone is null then raise exception 'Verify your email or phone to access orders'; end if;
  insert into public.order_access_grants(order_id,user_id)
  select o.id,auth.uid() from public.orders o join public.checkouts c on c.id=o.checkout_id
  where c.buyer_id is null and o.payment_state in ('paid','deposit_paid') and
    ((verified_email is not null and lower(o.customer_email)=verified_email) or
     (verified_phone is not null and regexp_replace(o.customer_phone,'[^0-9]','','g')=verified_phone)) on conflict do nothing;
  update public.orders o set user_id=auth.uid() where o.user_id is null and exists(select 1 from public.order_access_grants g where g.order_id=o.id and g.user_id=auth.uid());
  update public.notifications n set user_id=auth.uid() from public.orders o where n.order_id=o.id and o.user_id=auth.uid() and n.user_id is null;
end $$;

drop policy "authorized users view orders" on public.orders;
create policy "authorized users view orders" on public.orders for select using(public.can_access_customer_order(id) or assigned_staff_id=auth.uid() or public.current_role()='admin' or (public.current_role()='staff' and assigned_staff_id is null and stage='filing' and payment_state in ('paid','deposit_paid')));
drop policy "clients read applications" on public.applications;
create policy "clients read applications" on public.applications for select using(public.can_access_customer_order(order_id));
drop policy "authorized document metadata" on public.documents;
create policy "authorized document metadata" on public.documents for select using(public.can_access_customer_order(order_id) or exists(select 1 from public.orders o where o.id=order_id and (o.assigned_staff_id=auth.uid() or public.current_role()='admin')));
drop policy "authorized stage history" on public.order_stage_events;
create policy "authorized stage history" on public.order_stage_events for select using(exists(select 1 from public.orders o where o.id=order_id and (public.can_access_customer_order(o.id) or o.assigned_staff_id=auth.uid() or public.current_role()='admin')));
drop policy "clients view own bank requests" on public.bank_requests;
create policy "clients view own bank requests" on public.bank_requests for select using(exists(select 1 from public.orders o where o.id=order_id and (public.can_access_customer_order(o.id) or o.assigned_staff_id=auth.uid() or public.current_role()='admin')));
drop policy "authorized payments" on public.payments;
create policy "authorized payments" on public.payments for select using(public.current_role()='admin' or exists(select 1 from public.payment_allocations a where a.payment_id=payments.id and public.can_access_customer_order(a.order_id)) or public.can_access_customer_order(order_id));
drop policy "read checkouts" on public.checkouts;
create policy "read checkouts" on public.checkouts for select using(public.current_role()='admin' or buyer_id=auth.uid() or exists(select 1 from public.orders o where o.checkout_id=checkouts.id and public.can_access_customer_order(o.id)));
drop policy "read allocations" on public.payment_allocations;
create policy "read allocations" on public.payment_allocations for select using(public.current_role()='admin' or public.can_access_customer_order(order_id));
drop policy "read information requests" on public.information_requests;
create policy "read information requests" on public.information_requests for select using(exists(select 1 from public.orders o where o.id=order_id and (public.can_access_customer_order(o.id) or o.assigned_staff_id=auth.uid() or public.current_role()='admin')));
drop policy "read fulfillment requests" on public.fulfillment_requests;
create policy "read fulfillment requests" on public.fulfillment_requests for select using(public.can_access_customer_order(order_id) or public.current_role()='admin');
drop policy "read quotes" on public.fulfillment_quotes;
create policy "read quotes" on public.fulfillment_quotes for select using(exists(select 1 from public.fulfillment_requests f where f.id=request_id and (public.can_access_customer_order(f.order_id) or public.current_role()='admin')));
drop policy "users view own notifications" on public.notifications;
create policy "users view own notifications" on public.notifications for select using(user_id=auth.uid() or public.can_access_customer_order(order_id) or public.current_role()='admin');

-- OTP delivery data is deliberately not linked to auth.users: hooks run inside
-- an Auth transaction, so foreign-key checks against a new user would deadlock.
create table public.auth_otp_deliveries (
  id text primary key,
  phone_hash text not null,
  provider_id text unique,
  ciphertext text,
  status text not null default 'queued' check(status in ('queued','sending','whatsapp','sms_sending','sms','verified','expired','failed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index auth_otp_phone_idx on public.auth_otp_deliveries(phone_hash,created_at desc);
alter table public.auth_otp_deliveries enable row level security;

create function public.claim_otp_sms(p_id text) returns public.auth_otp_deliveries
language plpgsql security definer set search_path=public as $$
declare delivery public.auth_otp_deliveries;
begin
  update public.auth_otp_deliveries set status='sms_sending' where id=p_id and status in ('whatsapp','failed') and expires_at>now() and ciphertext is not null returning * into delivery;
  return delivery;
end $$;
revoke all on function public.claim_otp_sms(text) from public,anon,authenticated;
grant execute on function public.claim_otp_sms(text) to service_role;

-- Bind buyer ownership in the same transaction as checkout creation.
drop function public.create_checkout(uuid,text,uuid,text,jsonb,public.payment_plan,jsonb);
create function public.create_checkout(p_id uuid,p_reference text,p_key uuid,p_digest text,p_contact jsonb,p_plan public.payment_plan,p_items jsonb,p_buyer_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.checkouts%rowtype; previous_payment public.payments%rowtype; s jsonb; item jsonb; unit_price bigint; due bigint; total bigint:=0; charge bigint:=0;
  oid uuid; pid uuid; idx integer:=0; q integer; ord_plan public.payment_plan;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  select * into c from public.checkouts where idempotency_key=p_key;
  if found then
    if c.request_digest <> p_digest or c.buyer_id is distinct from p_buyer_id then raise exception 'Checkout details changed; please review and try again'; end if;
    select * into previous_payment from public.payments p where p.checkout_id=c.id and p.kind<>'balance' and p.fulfillment_request_id is null order by p.created_at desc,p.id desc limit 1;
    if previous_payment.status='failed' then
      insert into public.payments(checkout_id,reference,kind,expected_kobo,created_at) values(c.id,p_reference,previous_payment.kind,previous_payment.expected_kobo,clock_timestamp()) returning id into pid;
      insert into public.payment_allocations(payment_id,order_id,amount_kobo) select pid,a.order_id,a.amount_kobo from public.payment_allocations a where a.payment_id=previous_payment.id;
      return jsonb_build_object('checkoutId',c.id,'reference',p_reference,'orderReference',c.reference,'amount',previous_payment.expected_kobo,'authorizationUrl',null,'status','initialized');
    end if;
    return jsonb_build_object('checkoutId',c.id,'reference',previous_payment.reference,'orderReference',c.reference,'amount',previous_payment.expected_kobo,'authorizationUrl',previous_payment.authorization_url,'status',previous_payment.status);
  end if;
  if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>50 then raise exception 'Invalid cart'; end if;
  insert into public.checkouts(id,reference,idempotency_key,request_digest,customer_email,total_kobo,due_now_kobo,payment_plan,buyer_id)
  values(p_id,p_reference,p_key,p_digest,lower(p_contact->>'email'),0,0,p_plan,p_buyer_id);
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
      insert into public.orders(user_id,reference,checkout_id,service_code,service_snapshot,customer_name,customer_email,customer_phone,total_kobo,payment_plan,referral_code_used,whatsapp_consent)
      values(p_buyer_id,p_reference||'-'||lpad(idx::text,2,'0'),p_id,s->>'code',s,p_contact->>'fullName',lower(p_contact->>'email'),p_contact->>'phone',unit_price,ord_plan,nullif(p_contact->>'referralCode',''),coalesce((p_contact->>'whatsappConsent')::boolean,false)) returning id into oid;
      insert into public.payment_allocations values(pid,oid,due);
      total:=total+unit_price; charge:=charge+due;
    end loop;
  end loop;
  update public.checkouts set total_kobo=total,due_now_kobo=charge where id=p_id;
  update public.payments set expected_kobo=charge,kind=case when charge=total then 'full'::public.payment_kind else 'deposit'::public.payment_kind end where id=pid;
  return jsonb_build_object('checkoutId',p_id,'reference',p_reference,'amount',charge,'authorizationUrl',null,'status','initialized');
end $$;

revoke all on function public.create_checkout(uuid,text,uuid,text,jsonb,public.payment_plan,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.create_checkout(uuid,text,uuid,text,jsonb,public.payment_plan,jsonb,uuid) to service_role;

create function public.claim_otp_delivery(p_id text) returns public.auth_otp_deliveries
language plpgsql security definer set search_path=public as $$
declare delivery public.auth_otp_deliveries;
begin
  update public.auth_otp_deliveries set status='expired',ciphertext=null where expires_at<=now() and ciphertext is not null;
  update public.auth_otp_deliveries set status='sending' where id=p_id and status='queued' and expires_at>now() returning * into delivery;
  if delivery.id is not null then
    update public.auth_otp_deliveries set status='expired',ciphertext=null where phone_hash=delivery.phone_hash and id<>delivery.id and created_at<delivery.created_at and status<>'verified';
  end if;
  return delivery;
end $$;
revoke all on function public.claim_otp_delivery(text) from public,anon,authenticated;
grant execute on function public.claim_otp_delivery(text) to service_role;
