-- Synthetic demo records only; no Auth accounts or credentials are committed.
insert into public.products(id,name,type,sale_price_minor,cost_price_minor,notes,is_active)
values
 ('10000000-0000-4000-8000-000000000001','Afeela Care Basic','service',149900,50000,'Synthetic demo catalogue item',true),
 ('10000000-0000-4000-8000-000000000002','Afeela Care Plus','service',249900,85000,'Synthetic demo catalogue item',true)
on conflict(id) do nothing;
insert into public.product_variants(id,product_id,name,price_adjustment_minor)
values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Priority Support',50000)
on conflict(id) do nothing;
insert into public.plans(id,name,billing_interval,minimum_quantity,available_from,allow_pause,allow_early_close,allow_renewal,is_active)
values
 ('30000000-0000-4000-8000-000000000001','Monthly Care','monthly',1,current_date,true,true,true,true),
 ('30000000-0000-4000-8000-000000000002','Annual Care','yearly',1,current_date,false,true,true,true)
on conflict(id) do nothing;
insert into public.tax_rules(id,name,rate_bps,behavior,jurisdiction,is_active,valid_from)
values ('40000000-0000-4000-8000-000000000001','Demo zero-rate tax',0,'exclusive','Unspecified demo jurisdiction',true,current_date)
on conflict(id) do nothing;
insert into public.discounts(id,name,type,value_percent,valid_from,valid_until,usage_limit,is_active)
values ('41000000-0000-4000-8000-000000000001','Demo 10% discount','percentage',10,current_date,current_date+30,20,true)
on conflict(id) do nothing;
insert into public.customers(id,name,email,phone,company)
values ('50000000-0000-4000-8000-000000000001','Demo Customer','demo.customer@example.invalid','+910000000000','Example Company')
on conflict(id) do nothing;
insert into public.quotations(id,number,customer_id,status,valid_until,subtotal_minor,tax_total_minor,discount_total_minor,total_minor,notes)
values ('60000000-0000-4000-8000-000000000001','QOT-DEMO-0001','50000000-0000-4000-8000-000000000001','sent',current_date+30,149900,0,0,149900,'Synthetic demo quotation')
on conflict(id) do nothing;
insert into public.quotation_items(id,quotation_id,product_id,product_name_snapshot,quantity,unit_price_minor,tax_rate_bps,tax_amount_minor,discount_amount_minor,total_minor,position)
values ('61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Afeela Care Basic',1,149900,0,0,0,149900,0)
on conflict(id) do nothing;
insert into public.subscriptions(id,number,customer_id,plan_id,status,start_date,next_billing_date,payment_terms,subtotal_minor,total_minor)
values ('70000000-0000-4000-8000-000000000001','SUB-DEMO-0001','50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','active',current_date,current_date+30,'Net 15',149900,149900)
on conflict(id) do nothing;
insert into public.subscription_items(id,subscription_id,product_id,product_name_snapshot,quantity,unit_price_minor,total_minor)
values ('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Afeela Care Basic',1,149900,149900)
on conflict(id) do nothing;
insert into public.invoices(id,number,customer_id,subscription_id,status,billing_period_start,billing_period_end,due_date,customer_name_snapshot,customer_email_snapshot,subtotal_minor,total_minor,paid_minor,issued_at)
values ('80000000-0000-4000-8000-000000000001','INV-DEMO-0001','50000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','partially_paid',current_date,current_date+29,current_date+7,'Demo Customer','demo.customer@example.invalid',149900,149900,50000,now())
on conflict(id) do nothing;
insert into public.invoice_items(id,invoice_id,product_id,product_description_snapshot,quantity,unit_price_minor,tax_rate_bps,tax_amount_minor,discount_amount_minor,line_total_minor,tax_name_snapshot,tax_behavior_snapshot,position)
values ('81000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Afeela Care Basic (demo snapshot)',1,149900,0,0,0,149900,'Demo zero-rate tax','exclusive',0)
on conflict(id) do nothing;
insert into public.payments(id,invoice_id,amount_minor,method,payment_date,note)
values ('90000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001',50000,'other',current_date,'Synthetic demo payment')
on conflict(id) do nothing;
