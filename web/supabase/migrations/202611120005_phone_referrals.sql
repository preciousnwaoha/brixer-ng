-- Phone-only referrers can earn rewards; verified buyer/contact identities cannot refer themselves.
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
          join auth.users u on u.id=rc.user_id where upper(rc.code)=upper(o.referral_code_used)
            and not coalesce(lower(u.email)=lower(o.customer_email),false)
            and not coalesce(regexp_replace(nullif(u.phone,''),'[^0-9]','','g')=regexp_replace(o.customer_phone,'[^0-9]','','g'),false)
            and u.id is distinct from o.user_id
            and not exists(select 1 from public.checkouts c where c.id=o.checkout_id and c.buyer_id=u.id)
            and not exists(select 1 from public.order_access_grants g where g.order_id=o.id and g.user_id=u.id)
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

