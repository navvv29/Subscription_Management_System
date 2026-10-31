-- Run with: supabase test db (pgTAP required). Assertions execute as authenticated test users.
begin;
select plan(14);
select has_table('public','profiles','profiles table exists');
select has_table('public','invoices','invoices table exists');
select has_index('public','invoices','invoices_subscription_billing_period_uidx','invoice period idempotency index exists');
select has_index('public','subscriptions','subscriptions_status_next_billing_idx','billing lookup index exists');
select has_index('public','payments','payments_invoice_payment_date_idx','payment lookup index exists');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin)
values
 ('a0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@example.invalid','',now(),now(),now(),'{}','{}',false),
 ('a0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@example.invalid','',now(),now(),now(),'{}','{}',false),
 ('a0000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c@example.invalid','',now(),now(),now(),'{}','{}',false)
on conflict(id) do nothing;
insert into public.customers(id,name,email,auth_user_id) values
 ('b0000000-0000-4000-8000-000000000001','Customer A','a@example.invalid','a0000000-0000-4000-8000-000000000001'),
 ('b0000000-0000-4000-8000-000000000002','Customer B','b@example.invalid','a0000000-0000-4000-8000-000000000002');
insert into public.quotations(id,number,customer_id,status,valid_until) values
 ('c0000000-0000-4000-8000-000000000001','RLS-A-1','b0000000-0000-4000-8000-000000000001','draft',current_date+1),
 ('c0000000-0000-4000-8000-000000000002','RLS-B-1','b0000000-0000-4000-8000-000000000002','draft',current_date+1);
insert into public.plans(id,name,billing_interval,minimum_quantity) values ('d0000000-0000-4000-8000-000000000001','RLS plan','monthly',1);
insert into public.products(id,name,type,sale_price_minor,cost_price_minor) values ('f1000000-0000-4000-8000-000000000001','RLS zero price','service',0,0);
insert into public.subscriptions(id,number,customer_id,plan_id,status,start_date,next_billing_date) values
 ('e0000000-0000-4000-8000-000000000002','RLS-SUB-B','b0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000001','active',current_date,current_date+30);
insert into public.invoices(id,number,customer_id,subscription_id,status,due_date,customer_name_snapshot,customer_email_snapshot) values
 ('f0000000-0000-4000-8000-000000000002','RLS-INV-B','b0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000002','issued',current_date+7,'Customer B','b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
select is((select count(*)::int from public.quotations),1,'customer A can see exactly their own quotation');
select is((select count(*)::int from public.quotations where customer_id='b0000000-0000-4000-8000-000000000002'),0,'customer A cannot read customer B quotation');
select is((select count(*)::int from public.subscriptions where customer_id='b0000000-0000-4000-8000-000000000002'),0,'customer A cannot read customer B subscription');
select is((select count(*)::int from public.invoices where customer_id='b0000000-0000-4000-8000-000000000002'),0,'customer A cannot read customer B invoice');
select throws_ok($$update public.profiles set role='staff' where id='a0000000-0000-4000-8000-000000000001'$$, '42501', null, 'customer cannot assign themselves a staff role');
reset role;
select throws_ok($$insert into public.profiles(id,email,display_name,role) values ('a0000000-0000-4000-8000-000000000003','a@example.invalid','Duplicate','customer')$$, '23505', null, 'profile email must be unique');
select throws_ok($$insert into public.products(name,type,sale_price_minor,cost_price_minor) values ('bad','service',-1,0)$$, '23514', null, 'negative money is rejected');
select throws_ok($$insert into public.product_variants(product_id,name,price_adjustment_minor) values ('f1000000-0000-4000-8000-000000000001','invalid discount',-1)$$, '23514', null, 'variant adjustment cannot make effective price negative');
set local role anon;
select throws_ok($$select count(*) from public.quotations$$, '42501', null, 'unauthenticated user cannot read private quotations');
select * from finish();
rollback;
