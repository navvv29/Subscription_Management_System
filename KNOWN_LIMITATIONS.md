Subscript One — Known Limitations & Open Decisions

1. Email Delivery

Limitation: Password reset and invoice emails require a verified email provider and correct redirect configuration.

- Impact: Users may not receive emails.
- Workaround: Demonstrate the workflow without claiming successful delivery.
- Owner: Afeela + Navaneed.
- Next step: Configure and test email delivery.
- Status: Unverified.

2. Scheduled Production Billing

Limitation: Manually triggering Process Due Invoices does not prove automatic scheduled billing works.

- Impact: Invoices may not be generated automatically.
- Workaround: Use the authorized Process Due Invoices action.
- Owner: Navaneed + Afeela.
- Next step: Configure and test production scheduling.
- Status: Unverified.

3. Performance at Scale

Limitation: The under-two-second performance target with thousands of subscriptions needs benchmarking.

- Impact: Large-scale performance is unknown.
- Workaround: Use pagination and representative demo data.
- Owner: Afeela + Navaneed.
- Next step: Benchmark with thousands of subscriptions.
- Status: Unverified.

4. Tax Configuration

Limitation: Tax jurisdiction, rates and inclusive/exclusive tax behavior are not specified.

- Impact: Incorrect tax assumptions may produce incorrect invoice totals.
- Workaround: Document the chosen demo tax assumptions.
- Owner: Navaneed + Afeela.
- Next step: Agree on tax assumptions and test calculations.
- Status: Open decision.

5. Payment Gateway and Refunds

Limitation: Payment gateway integration, refunds and currency conversion are not specified.

- Impact: Online payment and refund functionality cannot be assumed.
- Workaround: Demonstrate manual payment recording if implemented.
- Owner: Navaneed.
- Next step: Document supported payment functionality.
- Status: Open decision.

6. Role-Based Access and Customer Data Isolation

Limitation: Role restrictions and customer-data isolation require actual authorization and RLS testing.

- Impact: Unauthorized access could expose customer information.
- Workaround: Do not claim security verification without evidence.
- Owner: Afeela.
- Next step: Test admin, staff and customer permissions.
- Status: Unverified.

7. Billing Reliability

Limitation: Duplicate invoice prevention and failed billing recovery require testing.

- Impact: Duplicate or skipped invoices could occur.
- Workaround: Review billing results and invoice records.
- Owner: Navaneed + Afeela.
- Next step: Test duplicate processing and failure recovery.
- Status: Unverified.

8. Discounts and Concurrency

Limitation: Discount thresholds, expiry, usage limits and concurrent requests require verification.

- Impact: Discounts may be incorrectly applied or usage limits exceeded.
- Workaround: Demonstrate only tested discount scenarios.
- Owner: Navaneed + Afeela.
- Next step: Test discount eligibility and usage limits.
- Status: Unverified.

9. Subscription Lifecycle

Limitation: Pause, early-close, auto-close and renewal behavior require verification.

- Impact: Incorrect subscription states could affect billing.
- Workaround: Demonstrate only verified lifecycle transitions.
- Owner: Navaneed + Afeela.
- Next step: Test valid and invalid transitions.
- Status: Unverified.

10. Final Demo Readiness

Item| Status| Next Action
Email provider| Unverified| Test delivery
Production scheduler| Unverified| Verify scheduling
Performance| Unverified| Measure timings
Tax rules| Open decision| Agree assumptions
Payment gateway| Open decision| Define scope
Refund policy| Open decision| Document scope
Role security| Unverified| Test permissions
Billing reliability| Unverified| Test duplicate protection
Discount concurrency| Unverified| Test usage limits

11. Demo Disclosure Rules

1. Never claim untested features are working.
2. Distinguish implemented, tested, configured and unverified functionality.
3. Explain manual billing as a demo operation, not production scheduling.
4. Disclose incomplete functionality honestly.
5. Only demonstrate features supported by actual evidence.

12. Final Verification

Before the final demonstration, ask each owner to report:

- Implemented features.
- Successfully tested features.
- Features requiring configuration.
- Unverified features.
- Critical outstanding bugs.

Update this document as evidence becomes available.

Final Rule: Accuracy and transparency are more important than making the demo appear complete.
Customer Portal Authentication and Data Isolation

Current Implementation Status

The customer portal currently uses a hardcoded demo profile instead of Supabase Auth.

Findings

1. Customer login is not connected to Supabase Auth.
2. Quotations are loaded from local sample data rather than authenticated customer-specific APIs.
3. The demo adapter filters records using the fixed customer ID "cust-001".
4. Customer-specific authorization is not enforced or verified on the server.
5. Subscriptions and invoices also rely on local demo filtering.
6. Customer A versus Customer B data isolation has not been tested.

Evidence

- "lib/api/portal.ts", line 18: Fixed demo session and "cust-001" filtering.
- "supabase/migrations/20261031000000_core_billing_schema.sql", line 323: Reported RLS configuration does not establish the required customer-specific access policies.
- "REQUIREMENTS_TRACEABILITY.md", line 25: Customer data isolation remains marked Not Started.

Impact

Real customer authentication and secure customer-specific access to quotations, subscriptions and invoices are not established.

Required Actions

1. Integrate Supabase Auth login and sign-out.
2. Map authenticated users to customer records.
3. Implement server-side customer-scoped endpoints.
4. Implement and verify ownership-based RLS policies.
5. Replace hardcoded demo-profile adapters.
6. Test Customer A and Customer B access restrictions.
7. Verify quotations, subscriptions and invoices separately.

Ownership

- Backend and RLS: Afeela.
- Customer portal integration: Shehruz.
- QA verification: Saarishma.

QA Status

UI: Demonstrated.

Authentication: Not implemented.

Customer-scoped APIs: Not implemented.

Data isolation: Unverified.

Security acceptance: Not passed.

Evidence Rule

No customer-data security requirement can be marked Verified until authenticated cross-customer access tests pass.
