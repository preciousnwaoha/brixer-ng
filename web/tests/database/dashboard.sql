\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email,email_confirmed_at,phone,phone_confirmed_at) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','buyer@example.com',now(),null,null),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','recipient@example.com',now(),null,null),
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','admin@example.com',now(),null,null),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd',null,null,'2348012345678',now()),
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','guest@example.com',now(),null,null);
update public.profiles set role='admin' where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
set local role service_role;
select public.create_checkout('11111111-1111-4111-8111-111111111111','BRX-BUYER','22222222-2222-4222-8222-222222222222','buyer-digest',
'{"fullName":"Recipient","email":"recipient@example.com","phone":"+2348012345678"}','installment','[{"serviceCode":"LTD","quantity":1,"priceKobo":6000000}]','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select * from public.fulfill_payment('BRX-BUYER',3000000,'buyer-provider','{}');
do $$ begin
  assert (select stage='enter_details' from public.orders where reference='BRX-BUYER-01'),'Paid item must wait for details';
  begin perform public.create_checkout('11111111-1111-4111-8111-111111111112','BRX-SPOOF','22222222-2222-4222-8222-222222222222','buyer-digest','{}','full','[]','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'); raise exception 'Reused another buyer checkout'; exception when others then if sqlerrm='Reused another buyer checkout' then raise; end if; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
select public.attach_guest_orders();
do $$ begin assert (select count(*) from public.orders where reference='BRX-BUYER-01')=0,'Edited recipient email inherited buyer order'; end $$;
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',true);
select public.attach_guest_orders();
do $$ begin assert (select count(*) from public.orders where reference='BRX-BUYER-01')=0,'Edited recipient phone inherited buyer order'; end $$;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
do $$ begin assert (select count(*) from public.orders where reference='BRX-BUYER-01')=1,'Buyer lost edited-contact purchase'; end $$;
set local role service_role;
select public.save_order_application((select id from public.orders where reference='BRX-BUYER-01'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"name":"Business"}',false);
do $$ begin assert (select stage='enter_details' from public.orders where reference='BRX-BUYER-01'),'Draft advanced the item'; end $$;
select public.save_order_application((select id from public.orders where reference='BRX-BUYER-01'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"name":"Business"}',true);
select public.save_order_application((select id from public.orders where reference='BRX-BUYER-01'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"name":"Business"}',true);
do $$ begin
  assert (select stage='filing' from public.orders where reference='BRX-BUYER-01');
  assert (select count(*) from public.order_stage_events where to_stage='filing')=1,'Duplicate details submission advanced twice';
  begin perform public.save_order_application((select id from public.orders where reference='BRX-BUYER-01'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{}',false); raise exception 'Reopened submitted details'; exception when others then if sqlerrm='Reopened submitted details' then raise; end if; end;
end $$;
select public.create_order_issue((select id from public.orders where reference='BRX-BUYER-01'),'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Please correct your details.',
'[{"label":"Explanation","type":"text","required":true},{"label":"Certificate","type":"file","required":true,"allowedMimeTypes":["application/pdf"]},{"label":"Office","type":"select","required":true,"options":["Lagos","Abuja"]}]');
-- Enforce each field's MIME restrictions inside upload finalization too.
insert into public.upload_intents(id,order_id,uploaded_by,kind,information_request_id,object_key,file_name,content_type,size_bytes)
select '77777777-7777-4777-8777-777777777777',order_id,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','application',id,'staging/issue-test','certificate.png','image/png',100 from public.information_requests where label='Certificate';
do $$ begin
  begin perform public.finalize_upload('77777777-7777-4777-8777-777777777777','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','documents/restricted','etag'); raise exception 'Ignored field MIME restrictions'; exception when others then if sqlerrm='Ignored field MIME restrictions' then raise; end if; end;
end $$;
update public.upload_intents set content_type='application/pdf',file_name='certificate.pdf' where id='77777777-7777-4777-8777-777777777777';
select public.finalize_upload('77777777-7777-4777-8777-777777777777','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','documents/restricted','etag');
do $$ begin
  begin perform public.create_order_issue((select id from public.orders where reference='BRX-BUYER-01'),'cccccccc-cccc-4ccc-8ccc-cccccccccccc','Duplicate issue','[{"label":"More","type":"text"}]'); raise exception 'Created two active issues'; exception when unique_violation then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
do $$ begin
  begin perform public.advance_order_stage((select id from public.orders where reference='BRX-BUYER-01'),'submitted'); raise exception 'Advanced an open issue'; exception when others then if sqlerrm='Advanced an open issue' then raise; end if; end;
end $$;
set local role service_role;
do $$ declare oid uuid; iid uuid; answers jsonb;
begin
  select id into oid from public.orders where reference='BRX-BUYER-01'; select id into iid from public.order_issues where order_id=oid;
  select jsonb_object_agg(id::text,case input_type when 'text' then 'Corrected name' when 'select' then 'Lagos' else '' end) into answers from public.information_requests where issue_id=iid;
  begin perform public.change_order_issue(oid,iid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','submit',answers); raise exception 'Submitted without required file'; exception when others then if sqlerrm='Submitted without required file' then raise; end if; end;
  assert (select bool_and(status='pending') from public.information_requests where issue_id=iid),'Partially committed an invalid form';
end $$;
insert into public.documents(id,order_id,information_request_id,kind,object_key,file_name,content_type,size_bytes)
select '12121212-1212-4212-8212-121212121212',order_id,id,'application','issue/certificate.pdf','certificate.pdf','application/pdf',100 from public.information_requests where label='Certificate';
do $$ declare oid uuid; iid uuid; answers jsonb;
begin
  select id into oid from public.orders where reference='BRX-BUYER-01'; select id into iid from public.order_issues where order_id=oid;
  select jsonb_object_agg(id::text,case input_type when 'text' then 'Corrected name' when 'select' then 'Lagos' else '12121212-1212-4212-8212-121212121212' end) into answers from public.information_requests where issue_id=iid;
  perform public.change_order_issue(oid,iid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','submit',answers);
  perform public.change_order_issue(oid,iid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','submit',answers);
  assert (select stage='filing' from public.orders where id=oid),'Issue response changed the underlying stage';
  assert (select status='submitted' and jsonb_array_length(history)=2 from public.order_issues where id=iid),'Issue did not enter admin review exactly once';
end $$;
insert into public.upload_intents(id,order_id,uploaded_by,kind,information_request_id,object_key,file_name,content_type,size_bytes)
select '88888888-8888-4888-8888-888888888888',order_id,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','application',id,'staging/late-issue','late.pdf','application/pdf',100 from public.information_requests where label='Certificate';
do $$ begin
  begin perform public.finalize_upload('88888888-8888-4888-8888-888888888888','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','documents/late','etag'); raise exception 'Accepted a file after issue submission'; exception when others then if sqlerrm='Accepted a file after issue submission' then raise; end if; end;
end $$;
set local role authenticated;
do $$ begin
  begin perform public.advance_order_stage((select id from public.orders where reference='BRX-BUYER-01'),'submitted'); raise exception 'Advanced before admin clearance'; exception when others then if sqlerrm='Advanced before admin clearance' then raise; end if; end;
end $$;
set local role service_role;
select public.change_order_issue((select id from public.orders where reference='BRX-BUYER-01'),(select id from public.order_issues),'cccccccc-cccc-4ccc-8ccc-cccccccccccc','reopen',null,'Please confirm the spelling.');
do $$ begin assert (select status='open' and jsonb_array_length(history)=3 from public.order_issues),'Reopening lost issue history'; end $$;
select public.change_order_issue((select id from public.orders where reference='BRX-BUYER-01'),(select id from public.order_issues),'cccccccc-cccc-4ccc-8ccc-cccccccccccc','clear');
set local role authenticated;
select public.advance_order_stage((select id from public.orders where reference='BRX-BUYER-01'),'submitted');
set local role service_role;
select public.create_checkout('33333333-3333-4333-8333-333333333333','BRX-GUEST','44444444-4444-4444-8444-444444444444','guest-digest','{"fullName":"Guest","email":"guest@example.com","phone":"+2348012345678"}','full','[{"serviceCode":"TIN","quantity":1,"priceKobo":500000}]');
select * from public.fulfill_payment('BRX-GUEST',500000,'guest-provider','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',true);
select public.attach_guest_orders();
do $$ begin assert (select count(*) from public.orders where reference='BRX-GUEST-01')=1,'Verified phone cannot access matching guest purchase'; end $$;
select set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',true);
select public.attach_guest_orders();
do $$ begin
  assert (select count(*) from public.orders where reference='BRX-GUEST-01')=1,'Verified email cannot access a phone-claimed guest purchase';
  assert (select count(*) from public.orders where reference='BRX-BUYER-01')=0,'Guest contact verification merged unrelated accounts';
end $$;
set local role service_role;
insert into public.auth_otp_deliveries(id,phone_hash,ciphertext,status,expires_at) values('otp-test','hash','encrypted','whatsapp',now()+interval '1 minute');
do $$ declare attempt public.auth_otp_deliveries; begin
  attempt:=public.claim_otp_sms('otp-test'); assert attempt.id='otp-test';
  attempt:=public.claim_otp_sms('otp-test'); assert attempt.id is null,'Duplicate callback sent SMS twice';
end $$;
insert into public.auth_otp_deliveries(id,phone_hash,ciphertext,status,expires_at) values('otp-expired','hash','encrypted','whatsapp',now()-interval '1 minute');
do $$ declare attempt public.auth_otp_deliveries; begin attempt:=public.claim_otp_sms('otp-expired'); assert attempt.id is null,'Expired OTP sent to SMS'; end $$;
-- Phone-only clients can refer another buyer without losing the self-referral guard.
select public.create_checkout('91919191-9191-4191-8191-919191919191','BRX-PHONE-REFERRAL','92929292-9292-4292-8292-929292929292','referral-digest','{"fullName":"Another client","email":"recipient@example.com","phone":"+2348098765432","referralCode":"BRX-DDDDDDD"}','full','[{"serviceCode":"LTD","quantity":1,"priceKobo":6000000}]','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select * from public.fulfill_payment('BRX-PHONE-REFERRAL',6000000,'referral-provider','{}');
do $$ begin assert (select count(*) from public.referral_ledger where referrer_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd' and status='available')=1,'Phone-only referrer did not receive the reward'; end $$;
select public.create_checkout('93939393-9393-4393-8393-939393939393','BRX-SELF-REFERRAL','94949494-9494-4494-8494-949494949494','self-digest','{"fullName":"Another recipient","email":"another@example.com","phone":"+2348076543210","referralCode":"BRX-DDDDDDD"}','full','[{"serviceCode":"LTD","quantity":1,"priceKobo":6000000}]','dddddddd-dddd-4ddd-8ddd-dddddddddddd');
select * from public.fulfill_payment('BRX-SELF-REFERRAL',6000000,'self-provider','{}');
do $$ begin assert (select count(*) from public.referral_ledger where referrer_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd')=1,'Edited recipient bypassed the buyer self-referral check'; end $$;
rollback;
