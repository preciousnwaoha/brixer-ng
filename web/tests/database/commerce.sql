\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email,email_confirmed_at,phone,phone_confirmed_at) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','customer@example.com',now(),'2348012345678',now()),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','other@example.com',now(),null,null),
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','admin@example.com',now(),null,null),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd','staff@example.com',now(),null,null),
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','customer@example.com',null,null,null);
update public.profiles set role='admin' where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
update public.profiles set role='staff' where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
set local role service_role;
select public.create_checkout('11111111-1111-4111-8111-111111111111','BRX-TEST-CART','22222222-2222-4222-8222-222222222222','test-digest',
'{"fullName":"Customer","email":"customer@example.com","phone":"+2348012345678","whatsappConsent":true}', 'installment',
'[{"serviceCode":"LTD","quantity":2,"priceKobo":6000000},{"serviceCode":"TIN","quantity":1,"priceKobo":500000}]');
select public.create_checkout('11111111-1111-4111-8111-111111111119','BRX-TEST-DUPLICATE','22222222-2222-4222-8222-222222222222','test-digest',
'{"fullName":"Customer","email":"customer@example.com","phone":"+2348012345678"}', 'installment',
'[{"serviceCode":"LTD","quantity":2,"priceKobo":6000000},{"serviceCode":"TIN","quantity":1,"priceKobo":500000}]');
do $$ begin
  assert (select count(*) from public.orders where checkout_id='11111111-1111-4111-8111-111111111111')=3,'Repeated services need independent jobs';
  assert (select due_now_kobo from public.checkouts where reference='BRX-TEST-CART')=6500000,'Mixed cart charges ineligible items in full';
  assert (select total_kobo from public.checkouts where reference='BRX-TEST-CART')=12500000;
  assert (select payment_plan from public.orders where service_code='TIN' and checkout_id='11111111-1111-4111-8111-111111111111')='full';
  begin perform public.fulfill_payment('BRX-TEST-CART',1,'provider','{}'); raise exception 'Accepted a wrong amount'; exception when others then if sqlerrm='Accepted a wrong amount' then raise; end if; end;
end $$;
select * from public.fulfill_payment('BRX-TEST-CART',6500000,'provider','{}');
select * from public.fulfill_payment('BRX-TEST-CART',6500000,'provider','{}');
do $$ begin
  assert (select sum(paid_kobo) from public.orders where checkout_id='11111111-1111-4111-8111-111111111111')=6500000,'Duplicate webhook double-counted money';
  assert (select count(*) from public.notifications where event_type='payment_confirmed')=1,'Duplicate receipt';
  assert (select count(*) from public.applications a join public.orders o on o.id=a.order_id where o.checkout_id='11111111-1111-4111-8111-111111111111')=3;
  assert (select count(*) from public.bank_requests b join public.orders o on o.id=b.order_id where o.checkout_id='11111111-1111-4111-8111-111111111111')=2;
  assert (select count(*) from public.notification_deliveries)=2,'Email plus consented WhatsApp';
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select public.attach_guest_orders();
do $$ begin
  assert (select count(*) from public.orders)=3,'Verified checkout email cannot see its purchases';
  begin insert into public.documents(order_id,kind,object_key,file_name,content_type,size_bytes) select id,'completed','forged','fake.pdf','application/pdf',1 from public.orders limit 1; raise exception 'Forged a document'; exception when insufficient_privilege then null; end;
  begin perform public.advance_order_stage((select id from public.orders limit 1),'filing',null); raise exception 'Client changed work stage'; exception when others then if sqlerrm='Client changed work stage' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
do $$ begin assert (select count(*) from public.orders)=0,'Another customer can see purchases'; end $$;
select set_config('request.jwt.claim.sub','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',true);
do $$ begin
  begin perform public.attach_guest_orders(); raise exception 'Unverified email claimed purchases'; exception when others then if sqlerrm='Unverified email claimed purchases' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',true);
do $$ begin
  begin perform public.advance_order_stage((select id from public.orders limit 1),'filing',null); raise exception 'Unassigned staff changed work stage'; exception when others then if sqlerrm='Unassigned staff changed work stage' then raise; end if; end;
end $$;
do $$ begin
  begin perform public.pickup_job('BRX-TEST-CART-01'); raise exception 'Picked up an item before details'; exception when others then if sqlerrm='Picked up an item before details' then raise; end if; end;
end $$;
set local role service_role;
select public.save_order_application((select id from public.orders where reference='BRX-TEST-CART-01'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"business_name":"Example company"}',true);
set local role authenticated;
select public.pickup_job('BRX-TEST-CART-01');
select public.advance_order_stage((select id from public.orders where reference='BRX-TEST-CART-01'),'filing',null);
select public.advance_order_stage((select id from public.orders where reference='BRX-TEST-CART-01'),'submitted',null);
select public.advance_order_stage((select id from public.orders where reference='BRX-TEST-CART-01'),'processing',null);
do $$ begin
  begin perform public.advance_order_stage((select id from public.orders where reference='BRX-TEST-CART-01'),'completed',null); raise exception 'Completed without documents'; exception when others then if sqlerrm='Completed without documents' then raise; end if; end;
end $$;
reset role;
insert into public.documents(order_id,owner_id,uploaded_by,kind,object_key,file_name,content_type,size_bytes)
select id,user_id,'dddddddd-dddd-4ddd-8ddd-dddddddddddd','completed','test/result.pdf','result.pdf','application/pdf',12 from public.orders where reference='BRX-TEST-CART-01';
set local role authenticated;
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',true);
select public.advance_order_stage((select id from public.orders where reference='BRX-TEST-CART-01'),'completed',null);
do $$ begin
  assert (select paid_kobo<total_kobo and stage='completed' from public.orders where reference='BRX-TEST-CART-01'),'Completion should not require balance';
  assert (select released_at is not null from public.documents where object_key='test/result.pdf');
end $$;
set local role service_role;
select public.prepare_balance((select id from public.orders where reference='BRX-TEST-CART-01'),'BRX-BAL-TEST');
select public.prepare_balance((select id from public.orders where reference='BRX-TEST-CART-01'),'BRX-BAL-DUP');
select * from public.fulfill_payment('BRX-BAL-TEST',3000000,'provider-balance','{}');
do $$ begin
  assert (select count(*) from public.payments where kind='balance')=1,'Concurrent balance attempts create duplicate charges';
  assert (select payment_state='paid' from public.orders where reference='BRX-TEST-CART-01');
  assert (select payment_state='deposit_paid' from public.orders where reference='BRX-TEST-CART-02'),'Paying one job unlocked its sibling';
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
select public.change_information_request(null,(select id from public.orders where reference='BRX-TEST-CART-02'),'Clarification','Explain your business','text',null,null);
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select public.change_information_request((select id from public.information_requests limit 1),(select id from public.orders where reference='BRX-TEST-CART-02'),null,null,null,null,'Customer response');
reset role;
insert into public.fulfillment_requests(id,order_id,options_snapshot) select 'ffffffff-ffff-4fff-8fff-ffffffffffff',id,'{"hardCopy":"Printed certificate"}' from public.orders where reference='BRX-TEST-CART-01';
set local role authenticated;
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
select public.set_fulfillment_quote('ffffffff-ffff-4fff-8fff-ffffffffffff',100000,'Courier quote',false);
set local role service_role;
select public.prepare_fulfillment_payment('ffffffff-ffff-4fff-8fff-ffffffffffff',1,'BRX-COPY-TEST');
select * from public.fulfill_payment('BRX-COPY-TEST',100000,'provider-copy','{}');
do $$ begin
  assert (select status='paid' from public.fulfillment_requests where id='ffffffff-ffff-4fff-8fff-ffffffffffff');
  assert (select paid_kobo=total_kobo from public.orders where reference='BRX-TEST-CART-01'),'Delivery payment altered service balance';
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
select public.set_fulfillment_quote('ffffffff-ffff-4fff-8fff-ffffffffffff',null,'Delivered',true);
set local role service_role;
-- A confirmed terminal failure gets a new attempt, not another set of service items.
select public.create_checkout('33333333-3333-4333-8333-333333333333','BRX-FAILED','44444444-4444-4444-8444-444444444444','retry-digest','{"fullName":"Customer","email":"customer@example.com","phone":"+2348012345678"}','full','[{"serviceCode":"TIN","quantity":1,"priceKobo":500000}]');
update public.payments set status='failed' where reference='BRX-FAILED';
select public.create_checkout('33333333-3333-4333-8333-333333333334','BRX-RETRY','44444444-4444-4444-8444-444444444444','retry-digest','{"fullName":"Customer","email":"customer@example.com","phone":"+2348012345678"}','full','[{"serviceCode":"TIN","quantity":1,"priceKobo":500000}]');
select public.create_checkout('33333333-3333-4333-8333-333333333335','BRX-RETRY-DUP','44444444-4444-4444-8444-444444444444','retry-digest','{"fullName":"Customer","email":"customer@example.com","phone":"+2348012345678"}','full','[{"serviceCode":"TIN","quantity":1,"priceKobo":500000}]');
do $$ begin
  assert (select count(*) from public.payments where checkout_id='33333333-3333-4333-8333-333333333333')=2,'Failed payment retry was not idempotent';
  assert (select count(*) from public.orders where checkout_id='33333333-3333-4333-8333-333333333333')=1,'Failed payment duplicated jobs';
end $$;
select * from public.fulfill_payment('BRX-RETRY',500000,'retry-provider','{}');
update public.services set definition=jsonb_set(definition,'{installmentEligible}','true') where code='TIN';
select public.create_checkout('55555555-5555-4555-8555-555555555555','BRX-LOW-PRICE','66666666-6666-4666-8666-666666666666','low-price-digest','{"fullName":"Customer","email":"customer@example.com","phone":"+2348012345678"}','installment','[{"serviceCode":"TIN","quantity":3,"priceKobo":500000}]');
do $$ begin assert (select due_now_kobo=1500000 from public.checkouts where reference='BRX-LOW-PRICE'),'Low unit price bypassed the minimum through quantity'; end $$;
update public.services set definition=jsonb_set(definition,'{priceKobo}','1000000') where code='TIN';
select public.create_checkout('77777777-7777-4777-8777-777777777777','BRX-BOUNDARY','88888888-8888-4888-8888-888888888888','boundary-digest','{"fullName":"Customer","email":"customer@example.com","phone":"+2348012345678"}','installment','[{"serviceCode":"TIN","quantity":1,"priceKobo":1000000,"dueNowKobo":500000}]');
do $$ begin assert (select due_now_kobo=500000 from public.checkouts where reference='BRX-BOUNDARY'),'Exactly 10000 naira should be eligible'; end $$;
insert into public.upload_intents(id,order_id,uploaded_by,kind,object_key,file_name,content_type,size_bytes)
select '12121212-1212-4212-8212-121212121212',id,'dddddddd-dddd-4ddd-8ddd-dddddddddddd','completed','staging/test','Additional result.pdf','application/pdf',100 from public.orders where reference='BRX-TEST-CART-01';
select public.finalize_upload('12121212-1212-4212-8212-121212121212','dddddddd-dddd-4ddd-8ddd-dddddddddddd','documents/test-additional','etag');
select public.finalize_upload('12121212-1212-4212-8212-121212121212','dddddddd-dddd-4ddd-8ddd-dddddddddddd','documents/test-additional','etag');
do $$ begin assert (select count(*) from public.documents where object_key='documents/test-additional')=1,'Upload finalization is not idempotent'; end $$;
rollback;
