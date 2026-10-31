create extension if not exists pgcrypto;

create type public.user_role as enum ('client', 'staff', 'admin');
create type public.order_stage as enum ('received', 'filing', 'submitted', 'processing', 'completed');
create type public.payment_plan as enum ('full', 'installment');
create type public.payment_state as enum ('pending', 'deposit_paid', 'paid', 'reversed');
create type public.payment_kind as enum ('full', 'deposit', 'balance');
create type public.payment_status as enum ('initialized', 'pending', 'succeeded', 'failed', 'reversed');
create type public.application_status as enum ('not_started', 'draft', 'submitted', 'needs_changes', 'approved');
create type public.payout_status as enum ('requested', 'approved', 'paid', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'client',
  staff_code text unique,
  whatsapp_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  service_code text not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  total_kobo bigint not null check (total_kobo > 0),
  paid_kobo bigint not null default 0 check (paid_kobo >= 0),
  payment_plan public.payment_plan not null,
  payment_state public.payment_state not null default 'pending',
  stage public.order_stage not null default 'received',
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  is_paused boolean not null default false,
  pause_reason text,
  referral_code_used text,
  whatsapp_consent boolean not null default false,
  claim_sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_id_idx on public.orders(user_id);
create index orders_assigned_staff_idx on public.orders(assigned_staff_id);
create index orders_stage_idx on public.orders(stage, created_at desc);
create index orders_email_idx on public.orders(lower(customer_email));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  reference text not null unique,
  kind public.payment_kind not null,
  expected_kobo bigint not null check (expected_kobo > 0),
  verified_kobo bigint,
  status public.payment_status not null default 'initialized',
  provider_id text,
  provider_payload jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.order_claims (
  order_id uuid primary key references public.orders(id) on delete cascade,
  token_digest text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.applications (
  order_id uuid primary key references public.orders(id) on delete cascade,
  status public.application_status not null default 'not_started',
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text,
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('application', 'completed', 'banking')),
  field_id text,
  object_key text not null unique,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null,
  etag text,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create index documents_order_idx on public.documents(order_id);

create table public.order_stage_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_stage public.order_stage,
  to_stage public.order_stage not null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.bank_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  bank_name text,
  status text not null default 'awaiting_details',
  included_with_cac boolean not null default false,
  routed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  event_type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  destination text not null,
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  provider_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index notification_pending_idx on public.notification_deliveries(status, next_attempt_at);

create table public.referral_codes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table public.referral_ledger (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  reward_kobo bigint not null,
  status text not null default 'pending' check (status in ('pending', 'available', 'paid', 'void')),
  available_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('referral', 'staff')),
  amount_kobo bigint not null check (amount_kobo > 0),
  status public.payout_status not null default 'requested',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.staff_earnings (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  amount_kobo bigint not null,
  status text not null default 'pending' check (status in ('pending', 'available', 'paid', 'void')),
  created_at timestamptz not null default now()
);

create table public.compliance_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  title text not null,
  status text not null default 'attention',
  due_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();
create trigger applications_updated before update on public.applications for each row execute function public.set_updated_at();
create trigger compliance_updated before update on public.compliance_items for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  insert into public.referral_codes (user_id, code) values (new.id, 'BRX-' || upper(substr(replace(new.id::text, '-', ''), 1, 7)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.current_role() returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.fulfill_payment(p_reference text, p_amount_kobo bigint, p_provider_id text, p_payload jsonb)
returns table(order_id uuid, order_reference text, customer_email text, customer_name text, needs_claim boolean, claim_sent_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_paid bigint;
begin
  select * into v_payment from public.payments where reference = p_reference for update;
  if not found then raise exception 'Payment reference not found'; end if;
  if v_payment.expected_kobo <> p_amount_kobo then raise exception 'Payment amount mismatch'; end if;
  select * into v_order from public.orders where id = v_payment.order_id for update;
  if v_payment.status <> 'succeeded' then
    update public.payments set status = 'succeeded', verified_kobo = p_amount_kobo, provider_id = p_provider_id, provider_payload = p_payload, verified_at = now() where id = v_payment.id;
    v_paid := least(v_order.total_kobo, v_order.paid_kobo + p_amount_kobo);
    update public.orders set paid_kobo = v_paid, payment_state = case when v_paid >= total_kobo then 'paid'::public.payment_state else 'deposit_paid'::public.payment_state end where id = v_order.id returning * into v_order;
    if v_order.user_id is not null then
      insert into public.notifications(user_id, order_id, event_type, title, body) values (v_order.user_id, v_order.id, 'payment_confirmed', 'Payment confirmed', 'Payment for ' || v_order.reference || ' has been confirmed.');
    end if;
  end if;
  return query select v_order.id, v_order.reference, v_order.customer_email, v_order.customer_name, v_order.user_id is null, v_order.claim_sent_at;
end $$;

create or replace function public.claim_order(p_order_id uuid, p_token_digest text, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare v_claim public.order_claims%rowtype; v_order public.orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_claim from public.order_claims where order_id = p_order_id and token_digest = p_token_digest for update;
  if not found or v_claim.used_at is not null or v_claim.expires_at < now() then raise exception 'Claim link is invalid or expired'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if lower(v_order.customer_email) <> lower(p_email) then raise exception 'Signed-in email does not match checkout email'; end if;
  if v_order.user_id is not null and v_order.user_id <> auth.uid() then raise exception 'Order has already been claimed'; end if;
  update public.orders set user_id = auth.uid() where id = p_order_id;
  update public.order_claims set used_at = now() where order_id = p_order_id;
  insert into public.applications(order_id) values (p_order_id) on conflict do nothing;
end $$;

create or replace function public.pickup_job(p_order_reference text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() not in ('staff', 'admin') then raise exception 'Staff access required'; end if;
  update public.orders set assigned_staff_id = auth.uid() where reference = p_order_reference and assigned_staff_id is null;
  if not found then raise exception 'Job is no longer available'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id) values (auth.uid(), 'job_picked_up', 'order', p_order_reference);
end $$;

create or replace function public.advance_order_stage(p_order_id uuid, p_stage public.order_stage, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype; v_allowed boolean := false;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if public.current_role() = 'staff' and v_order.assigned_staff_id <> auth.uid() then raise exception 'Order is not assigned to this staff account'; end if;
  if public.current_role() not in ('staff', 'admin') then raise exception 'Staff access required'; end if;
  v_allowed := (v_order.stage = 'received' and p_stage = 'filing') or (v_order.stage = 'filing' and p_stage = 'submitted') or (v_order.stage = 'submitted' and p_stage = 'processing') or (v_order.stage = 'processing' and p_stage = 'completed');
  if not v_allowed and public.current_role() <> 'admin' then raise exception 'Invalid stage transition'; end if;
  if v_order.stage = 'filing' and p_stage = 'submitted' and v_order.paid_kobo < v_order.total_kobo then raise exception 'Outstanding balance must be paid first'; end if;
  insert into public.order_stage_events(order_id, from_stage, to_stage, note, created_by) values (v_order.id, v_order.stage, p_stage, p_note, auth.uid());
  update public.orders set stage = p_stage, completed_at = case when p_stage = 'completed' then now() else completed_at end where id = p_order_id;
end $$;

create or replace function public.flag_order_delay(p_order_reference text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where reference = p_order_reference for update;
  if public.current_role() = 'staff' and v_order.assigned_staff_id <> auth.uid() then raise exception 'Order is not assigned to this staff account'; end if;
  if public.current_role() not in ('staff', 'admin') then raise exception 'Staff access required'; end if;
  update public.orders set is_paused = true, pause_reason = p_reason where id = v_order.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'order_delay_flagged', 'order', p_order_reference, jsonb_build_object('reason', p_reason));
end $$;

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.order_claims enable row level security;
alter table public.applications enable row level security;
alter table public.documents enable row level security;
alter table public.order_stage_events enable row level security;
alter table public.bank_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referral_ledger enable row level security;
alter table public.payout_requests enable row level security;
alter table public.staff_earnings enable row level security;
alter table public.compliance_items enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles view own or admin" on public.profiles for select using (id = auth.uid() or public.current_role() = 'admin');
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = public.current_role());
create policy "authorized users view orders" on public.orders for select using (user_id = auth.uid() or assigned_staff_id = auth.uid() or public.current_role() = 'admin' or (public.current_role() = 'staff' and assigned_staff_id is null and stage = 'received' and payment_state <> 'pending'));
create policy "clients view own payments" on public.payments for select using (exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or o.assigned_staff_id = auth.uid() or public.current_role() = 'admin')));
create policy "clients manage own applications" on public.applications for all using (exists(select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())) with check (exists(select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "staff view assigned applications" on public.applications for select using (exists(select 1 from public.orders o where o.id = order_id and (o.assigned_staff_id = auth.uid() or public.current_role() = 'admin')));
create policy "authorized document metadata" on public.documents for select using (owner_id = auth.uid() or uploaded_by = auth.uid() or exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or o.assigned_staff_id = auth.uid() or public.current_role() = 'admin')));
create policy "clients insert own document metadata" on public.documents for insert with check (owner_id = auth.uid() and exists(select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "authorized stage history" on public.order_stage_events for select using (exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or o.assigned_staff_id = auth.uid() or public.current_role() = 'admin')));
create policy "clients view own bank requests" on public.bank_requests for select using (exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or o.assigned_staff_id = auth.uid() or public.current_role() = 'admin')));
create policy "users view own notifications" on public.notifications for select using (user_id = auth.uid() or public.current_role() = 'admin');
create policy "users update own notifications" on public.notifications for update using (user_id = auth.uid());
create policy "users view own referral code" on public.referral_codes for select using (user_id = auth.uid() or public.current_role() = 'admin');
create policy "users view own referral earnings" on public.referral_ledger for select using (referrer_id = auth.uid() or public.current_role() = 'admin');
create policy "users manage own payout requests" on public.payout_requests for select using (user_id = auth.uid() or public.current_role() = 'admin');
create policy "users request payout" on public.payout_requests for insert with check (user_id = auth.uid());
create policy "staff view own earnings" on public.staff_earnings for select using (staff_id = auth.uid() or public.current_role() = 'admin');
create policy "users view own compliance" on public.compliance_items for select using (user_id = auth.uid() or public.current_role() = 'admin');
create policy "admins view audit" on public.audit_logs for select using (public.current_role() = 'admin');

grant execute on function public.claim_order(uuid, text, text) to authenticated;
grant execute on function public.pickup_job(text) to authenticated;
grant execute on function public.advance_order_stage(uuid, public.order_stage, text) to authenticated;
grant execute on function public.flag_order_delay(text, text) to authenticated;
revoke execute on function public.fulfill_payment(text, bigint, text, jsonb) from public, anon, authenticated;
