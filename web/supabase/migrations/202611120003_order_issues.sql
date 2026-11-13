create table public.order_issues (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  stage public.order_stage not null check(stage in ('filing','submitted','processing')),
  message text not null check(length(trim(message)) between 3 and 2000),
  status text not null default 'open' check(status in ('open','submitted','cleared')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  cleared_at timestamptz,
  history jsonb not null default '[]'
);
create unique index one_unresolved_order_issue on public.order_issues(order_id) where status<>'cleared';
alter table public.order_issues enable row level security;
create policy "authorized issue readers" on public.order_issues for select using(exists(select 1 from public.orders o where o.id=order_id and (public.can_access_customer_order(o.id) or o.assigned_staff_id=auth.uid() or public.current_role()='admin')));
alter table public.information_requests add column issue_id uuid references public.order_issues(id);
alter table public.information_requests drop constraint information_requests_input_type_check;
alter table public.information_requests add constraint information_requests_input_type_check check(input_type in ('text','tel','email','file','date','select'));
alter table public.information_requests add column required boolean not null default true;
alter table public.information_requests add column options jsonb not null default '[]';
alter table public.information_requests add column allowed_mime_types jsonb not null default '["application/pdf","image/jpeg","image/png"]';

-- Keep legacy answers and upload references intact when grouping active requests.
do $$ declare o public.orders%rowtype; iid uuid;
begin
  for o in select * from public.orders where stage in ('filing','submitted','processing') and exists(select 1 from public.information_requests r where r.order_id=orders.id and r.status<>'resolved') loop
    insert into public.order_issues(order_id,stage,message,status,submitted_at,history)
    values(o.id,o.stage,case when length(trim(coalesce(o.pause_reason,'')))>=3 then left(o.pause_reason,2000) else 'Please provide the additional information requested by our team.' end,
      case when exists(select 1 from public.information_requests where order_id=o.id and status='pending') then 'open' else 'submitted' end,
      case when not exists(select 1 from public.information_requests where order_id=o.id and status='pending') then now() end,
      jsonb_build_array(jsonb_build_object('action','migrated','at',now()))) returning id into iid;
    update public.information_requests set issue_id=iid where order_id=o.id and status<>'resolved';
  end loop;
end $$;

update public.orders o set stage=case when exists(select 1 from public.applications a where a.order_id=o.id and a.status in ('submitted','approved')) or jsonb_array_length(coalesce(o.service_snapshot->'formFields','[]'))=0 then 'filing'::public.order_stage else 'enter_details'::public.order_stage end
where stage='received' and payment_state in ('paid','deposit_paid');

create function public.initial_payment_details_stage() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.payment_state='pending' and new.payment_state in ('paid','deposit_paid') and old.stage='received' then
    new.stage:=case when jsonb_array_length(coalesce(new.service_snapshot->'formFields','[]'))=0 then 'filing'::public.order_stage else 'enter_details'::public.order_stage end;
    insert into public.order_stage_events(order_id,from_stage,to_stage,note) values(new.id,old.stage,new.stage,'Initial payment confirmed');
  end if;
  return new;
end $$;
create trigger paid_order_details_stage before update on public.orders for each row execute function public.initial_payment_details_stage();

create function public.save_order_application(p_order_id uuid,p_actor_id uuid,p_answers jsonb,p_submit boolean) returns void
language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; a public.applications%rowtype;
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found or not public.customer_order_access(o.id,p_actor_id) then raise exception 'Access denied'; end if;
  if o.payment_state not in ('paid','deposit_paid') then raise exception 'Payment has not been confirmed'; end if;
  select * into a from public.applications where order_id=o.id for update;
  if a.status in ('submitted','approved') then
    if p_submit and a.answers=p_answers then return; end if;
    raise exception 'These details have already been submitted. Use the issue form for any requested changes';
  end if;
  if o.stage not in ('received','enter_details') then raise exception 'Initial details can no longer be changed'; end if;
  insert into public.applications(order_id,answers,status,submitted_at)
  values(o.id,p_answers,case when p_submit then 'submitted'::public.application_status else 'draft'::public.application_status end,case when p_submit then now() end)
  on conflict(order_id) do update set answers=excluded.answers,status=excluded.status,submitted_at=excluded.submitted_at;
  if p_submit then
    update public.orders set stage='filing' where id=o.id;
    insert into public.order_stage_events(order_id,from_stage,to_stage,note,created_by) values(o.id,o.stage,'filing','Required details submitted',p_actor_id);
    perform public.queue_order_notification(o.id,'details_submitted','Your details have been received','Our team can now begin filing your service item.','details:'||o.id);
  end if;
end $$;

create function public.create_order_issue(p_order_id uuid,p_actor_id uuid,p_message text,p_fields jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; iid uuid; field jsonb;
begin
  if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then raise exception 'Admin access required'; end if;
  select * into o from public.orders where id=p_order_id for update;
  if not found or o.stage not in ('filing','submitted','processing') or o.payment_state not in ('paid','deposit_paid') then raise exception 'Issues can only be raised during filing, submission or processing'; end if;
  if jsonb_array_length(p_fields) not between 1 and 30 then raise exception 'Add at least one requested field'; end if;
  insert into public.order_issues(order_id,stage,message,created_by,history) values(o.id,o.stage,p_message,p_actor_id,jsonb_build_array(jsonb_build_object('action','opened','message',p_message,'actor',p_actor_id,'at',now()))) returning id into iid;
  for field in select value from jsonb_array_elements(p_fields) loop
    insert into public.information_requests(order_id,issue_id,label,description,input_type,required,options,allowed_mime_types,created_by)
    values(o.id,iid,field->>'label','',field->>'type',coalesce((field->>'required')::boolean,true),coalesce(field->'options','[]'),coalesce(field->'allowedMimeTypes','["application/pdf","image/jpeg","image/png"]'),p_actor_id);
  end loop;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(p_actor_id,'issue_opened','order_issue',iid::text);
  perform public.queue_order_notification(o.id,'issue_opened','Your order needs attention',p_message,'issue:'||iid||':opened');
  return iid;
end $$;

create function public.change_order_issue(p_order_id uuid,p_issue_id uuid,p_actor_id uuid,p_action text,p_answers jsonb default null,p_message text default null) returns void
language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; issue public.order_issues%rowtype; field public.information_requests%rowtype; value text; entry jsonb;
begin
  select * into o from public.orders where id=p_order_id for update;
  select * into issue from public.order_issues where id=p_issue_id and order_id=p_order_id for update;
  if not found then raise exception 'Issue not found'; end if;
  if p_action='submit' then
    if not public.customer_order_access(o.id,p_actor_id) then raise exception 'Access denied'; end if;
    if issue.status='submitted' and p_answers=(select jsonb_object_agg(id::text,response) from public.information_requests where issue_id=issue.id) then return; end if;
    if issue.status<>'open' then raise exception 'This issue is no longer accepting responses'; end if;
    for field in select * from public.information_requests where issue_id=issue.id loop
      value:=trim(coalesce(p_answers->>field.id::text,''));
      if field.required and value='' then raise exception '% is required',field.label; end if;
      if field.input_type='file' and value<>'' and not exists(select 1 from public.documents d where d.id::text=value and d.order_id=o.id and d.information_request_id=field.id and d.kind='application' and field.allowed_mime_types ? d.content_type) then raise exception 'Upload a valid file for %',field.label; end if;
      if field.input_type='select' and value<>'' and not field.options ? value then raise exception 'Choose an available option'; end if;
      update public.information_requests set response=value,status='submitted',updated_at=now() where id=field.id;
    end loop;
    entry:=jsonb_build_object('action','submitted','answers',p_answers,'actor',p_actor_id,'at',now());
    update public.order_issues set status='submitted',submitted_at=now(),history=history||jsonb_build_array(entry) where id=issue.id;
  else
    if not exists(select 1 from public.profiles where id=p_actor_id and role='admin') then raise exception 'Admin access required'; end if;
    if issue.status='cleared' then raise exception 'This issue has already been cleared'; end if;
    if p_action='clear' then
      update public.order_issues set status='cleared',cleared_at=now(),history=history||jsonb_build_array(jsonb_build_object('action','cleared','actor',p_actor_id,'at',now())) where id=issue.id;
      update public.information_requests set status='resolved',updated_at=now() where issue_id=issue.id;
      update public.orders set is_paused=false,pause_reason=null where id=o.id;
      perform public.queue_order_notification(o.id,'issue_cleared','Your order is continuing','Our team has cleared the issue and is continuing your service item.','issue:'||issue.id||':cleared');
    elsif p_action='reopen' and issue.status='submitted' then
      if length(trim(coalesce(p_message,''))) not between 3 and 2000 then raise exception 'Explain what the customer should correct'; end if;
      update public.order_issues set status='open',message=p_message,submitted_at=null,history=history||jsonb_build_array(jsonb_build_object('action','reopened','message',p_message,'actor',p_actor_id,'at',now())) where id=issue.id;
      update public.information_requests set status='pending',updated_at=now() where issue_id=issue.id;
      perform public.queue_order_notification(o.id,'issue_reopened','More information needed',p_message,'issue:'||issue.id||':reopen:'||clock_timestamp());
    else raise exception 'Invalid issue action'; end if;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(p_actor_id,'issue_'||p_action,'order_issue',issue.id::text);
end $$;

revoke all on function public.save_order_application(uuid,uuid,jsonb,boolean),public.create_order_issue(uuid,uuid,text,jsonb),public.change_order_issue(uuid,uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_order_application(uuid,uuid,jsonb,boolean),public.create_order_issue(uuid,uuid,text,jsonb),public.change_order_issue(uuid,uuid,uuid,text,jsonb,text) to service_role;

create or replace function public.pickup_job(p_order_reference text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if coalesce(public.current_role()::text,'') not in ('staff','admin') then raise exception 'Staff access required'; end if;
  update public.orders set assigned_staff_id=auth.uid() where reference=p_order_reference and assigned_staff_id is null and stage='filing' and payment_state in ('paid','deposit_paid');
  if not found then raise exception 'This job is no longer available'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'job_picked_up','order',p_order_reference);
end $$;

create or replace function public.advance_order_stage(p_order_id uuid,p_stage public.order_stage,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; allowed boolean;
begin
  if coalesce(public.current_role()::text,'') not in ('admin','staff') then raise exception 'Staff access required'; end if;
  select * into o from public.orders where id=p_order_id for update;
  if not found or (public.current_role()='staff' and o.assigned_staff_id is distinct from auth.uid()) then raise exception 'Item is not assigned to this account'; end if;
  if o.payment_state not in ('paid','deposit_paid') then raise exception 'Initial payment is required'; end if;
  if exists(select 1 from public.order_issues where order_id=o.id and status<>'cleared') then raise exception 'Clear the current issue before advancing this item'; end if;
  if o.stage in ('received','enter_details') or p_stage in ('received','enter_details') then raise exception 'The customer must submit required details first'; end if;
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

create or replace function public.change_information_request(p_id uuid,p_order_id uuid,p_label text,p_description text,p_type text,p_status text default null,p_response text default null) returns uuid
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
    if r.issue_id is not null then raise exception 'Use the grouped issue form'; end if;
    if public.current_role()='admin' then
      if p_status not in ('pending','resolved') then raise exception 'Invalid status'; end if;
      update public.information_requests set status=p_status,description=coalesce(p_description,description),updated_at=now() where id=rid;
      if p_status='pending' then perform public.queue_order_notification(o.id,'information_requested','More information needed',r.label||': '||coalesce(p_description,r.description),'information:'||rid||':'||clock_timestamp()); end if;
    elsif public.can_access_customer_order(o.id) then
      if r.status='resolved' then raise exception 'This request has already been resolved'; end if;
      if r.input_type='file' and not exists(select 1 from public.documents where information_request_id=rid and kind='application') then raise exception 'Upload the requested file first'; end if;
      if r.input_type='text' and length(trim(coalesce(p_response,'')))=0 then raise exception 'Enter the requested information'; end if;
      update public.information_requests set response=p_response,status='submitted',updated_at=now() where id=rid;
    else raise exception 'Access denied'; end if;
  end if;
  return rid;
end $$;

