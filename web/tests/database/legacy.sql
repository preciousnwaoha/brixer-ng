insert into public.orders(id,reference,service_code,customer_name,customer_email,customer_phone,total_kobo,paid_kobo,payment_plan,payment_state,stage)
values('99999999-9999-4999-8999-999999999999','BRX-LEGACY-ORDER','BN','Legacy customer','legacy@example.com','+2348099999999',1234500,1234500,'full','paid','completed');
insert into public.payments(order_id,reference,kind,expected_kobo,verified_kobo,status)
values('99999999-9999-4999-8999-999999999999','BRX-LEGACY-PAYMENT','full',1234500,1234500,'succeeded');
insert into public.documents(order_id,kind,object_key,file_name,content_type,size_bytes,released_at)
values('99999999-9999-4999-8999-999999999999','completed','legacy/document.pdf','Legacy certificate.pdf','application/pdf',100,now());
