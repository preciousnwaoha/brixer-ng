do $$ begin
  assert (select checkout_id=id from public.orders where reference='BRX-LEGACY-ORDER'),'Upgrade changed legacy order identity';
  assert (select (service_snapshot->>'priceKobo')::bigint=1234500 from public.orders where reference='BRX-LEGACY-ORDER'),'Upgrade replaced a historical price with the current catalogue price';
  assert (select count(*) from public.payment_allocations a join public.payments p on p.id=a.payment_id where p.reference='BRX-LEGACY-PAYMENT' and a.order_id='99999999-9999-4999-8999-999999999999' and a.amount_kobo=1234500)=1;
  assert (select order_id='99999999-9999-4999-8999-999999999999' and released_at is not null from public.documents where object_key='legacy/document.pdf'),'Upgrade changed a document association';
end $$;
