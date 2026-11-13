create or replace function public.finalize_upload(p_upload_id uuid,p_user_id uuid,p_key text,p_etag text) returns uuid
language plpgsql security definer set search_path=public as $$
declare u public.upload_intents%rowtype; o public.orders%rowtype; doc uuid; requested public.information_requests%rowtype; form_field jsonb;
begin
  select * into u from public.upload_intents where id=p_upload_id and uploaded_by=p_user_id for update;
  if not found then raise exception 'Upload authorization not found'; end if;
  if u.finalized_at is not null then select id into doc from public.documents where object_key=p_key; return doc; end if;
  if u.expires_at<now() then raise exception 'Upload authorization expired'; end if;
  select * into o from public.orders where id=u.order_id for update;
  if o.payment_state not in ('paid','deposit_paid') then raise exception 'Payment must be confirmed before uploading'; end if;
  if u.kind='application' then
    if not public.customer_order_access(o.id,p_user_id) then raise exception 'Customer access required'; end if;
    if u.information_request_id is not null then
      select * into requested from public.information_requests where id=u.information_request_id and order_id=o.id;
      if not found or requested.input_type<>'file' or requested.status='resolved' or not requested.allowed_mime_types ? u.content_type then raise exception 'This file request is not available'; end if;
      if requested.issue_id is not null and not exists(select 1 from public.order_issues where id=requested.issue_id and status='open') then raise exception 'This issue is no longer accepting uploads'; end if;
    else
      if o.stage not in ('received','enter_details') then raise exception 'Initial details have already been submitted'; end if;
      select value into form_field from jsonb_array_elements(o.service_snapshot->'formFields') where value->>'id'=u.field_id and value->>'type'='file';
      if form_field is null or not coalesce(form_field->'allowedMimeTypes','["application/pdf","image/jpeg","image/png"]') ? u.content_type then raise exception 'Invalid upload field or file type'; end if;
    end if;
  elsif not exists(select 1 from public.profiles where id=p_user_id and (role='admin' or (role='staff' and o.assigned_staff_id=p_user_id))) then raise exception 'Operator access required';
  end if;
  insert into public.documents(order_id,owner_id,uploaded_by,kind,field_id,information_request_id,object_key,file_name,content_type,size_bytes,etag,released_at)
  values(o.id,o.user_id,u.uploaded_by,u.kind,u.field_id,u.information_request_id,p_key,u.file_name,u.content_type,u.size_bytes,p_etag,case when u.kind<>'application' and o.stage='completed' then now() end) returning id into doc;
  update public.upload_intents set finalized_at=now() where id=u.id;
  if u.kind<>'application' and o.stage='completed' then perform public.queue_order_notification(o.id,'documents_added','New documents are ready','Additional documents are available in your service item. Any outstanding service balance must be settled before downloading.','document:'||doc); end if;
  return doc;
end $$;
revoke all on function public.finalize_upload(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finalize_upload(uuid,uuid,text,text) to service_role;

