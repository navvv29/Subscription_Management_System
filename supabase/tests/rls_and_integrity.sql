begin;
select plan(16);
select has_table('public','profiles','profiles table exists');
select has_table('public','invoices','invoices table exists');
select has_index('public','invoices','invoices_subscription_billing_period_uidx','billing period idempotency index exists');
select has_index('public','subscriptions','subscriptions_status_next_billing_idx','billing lookup index exists');
select has_index('public','payments','payments_invoice_payment_date_idx','payment lookup index exists');
select ok(not has_column_privilege('anon','public.products','cost_price_minor','select'),'public users cannot select product cost');
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin)
values
 ('a0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@example.invalid','',now(),now(),now(),'{}','{}',false),
 ('a0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@example.invalid','',now(),now(),now(),'{}','{}',false),
 ('a0000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c@example.invalid','',now(),now(),now(),'{}','{}',false)
on conflict(id) do nothing;
insert into public.customers(id,name,email,auth_user_id) values
 ('b0000000-0000-4000-8000-000000000001','Customer A','a@example.invalid','a0000000-0000-4000-8000-000000000001'),
 ('b0000000-0000-4000-8000-000000000002','Customer B','b@example.invalid','a0000000-0000-4000-8000-000000000002');
insert into public.plans(id,name,billing_interval,minimum_quantity) values ('d0000000-0000-4000-8000-000000000001','RLS plan','monthly',1);
insert into public.products(id,name,type,sale_price_minor) values ('f1000000-0000-4000-8000-000000000001','RLS zero price','service',0);
insert into public.quotations(id,number,customer_id,status,valid_until) values
 ('c0000000-0000-4000-8000-000000000001','RLS-Q-A','b0000000-0000-4000-8000-000000000001','draft',current_date+1),
 ('c0000000-0000-4000-8000-000000000002','RLS-Q-B','b0000000-0000-4000-8000-000000000002','draft',current_date+1);
insert into public.subscriptions(id,number,customer_id,plan_id,status,start_date,next_billing_date,payment_terms) values
 ('e0000000-0000-4000-8000-000000000002','RLS-SUB-B','b0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000001','active',current_date,current_date+30,'Net 15');
insert into public.invoices(id,number,customer_id,subscription_id,status,due_date,customer_name_snapshot,customer_email_snapshot) values
 ('f0000000-0000-4000-8000-000000000002','RLS-INV-B','b0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000002','confirmed',current_date+7,'Customer B','b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
select is((select count(*)::int from public.quotations),1,'customer A can see their own quotation');
select is((select count(*)::int from public.quotations where customer_id='b0000000-0000-4000-8000-000000000002'),0,'customer A cannot read customer B quotations');
select is((select count(*)::int from public.subscriptions where customer_id='b0000000-0000-4000-8000-000000000002'),0,'customer A cannot read customer B subscriptions');
select is((select count(*)::int from public.invoices where customer_id='b0000000-0000-4000-8000-000000000002'),0,'customer A cannot read customer B invoices');
select throws_ok($$update public.profiles set role='staff' where id='a0000000-0000-4000-8000-000000000001'$$,'42501',null,'customer cannot promote themselves');
reset role;
select throws_ok($$update public.profiles set email='a@example.invalid' where id='a0000000-0000-4000-8000-000000000003'$$,'23505',null,'profile emails are unique');
select throws_ok($$insert into public.customers(name,email) values ('Duplicate customer','a@example.invalid')$$,'23505',null,'customer emails are unique');
select throws_ok($$insert into public.products(name,type,sale_price_minor,cost_price_minor) values ('negative','service',-1,0)$$,'23514',null,'negative product money is rejected');
select throws_ok($$insert into public.product_variants(product_id,name,price_adjustment_minor) values ('f1000000-0000-4000-8000-000000000001','invalid adjustment',-1)$$,'23514',null,'variant cannot make effective product price negative');
set local role anon;
select throws_ok($$select count(*) from public.quotations$$,'42501',null,'anonymous users cannot read private records');
select * from finish();
rollback;
