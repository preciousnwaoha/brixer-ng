-- Commit the enum addition before subsequent migrations use it.
alter type public.order_stage add value if not exists 'enter_details' after 'received';
