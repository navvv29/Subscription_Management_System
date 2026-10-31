Subscript One — Requirements Traceability

Purpose

Track the implementation and verification of all functional and non-functional requirements.

Status Definitions

- Not started
- In progress
- Implemented — needs test
- Verified
- Deferred with reason

Functional Requirements

ID| Requirement| Owner| Implementation / PR| Evidence / Status| Open question
F01| Customer registration| Afeela| Pending| Not started| 
F02| Unique email per account| Afeela| Pending| Not started| 
F03| Password validation| Afeela| Pending| Not started| 
F04| Password reset email| Afeela| Pending| Not started| 
F05| User roles| Afeeela| Pending| Not started| 
F06| Admin-only staff creation| Afeela| Pending| Not started| 
F07 | Customers can access only their own records | Afeela | Pending customer-scoped APIs and RLS | Not verified | Can Customer A access Customer B's records? |
F08| Product management| Afeela| Pending| Not started| 
F09| Product variants| Afeela| Pending| Not started| 
F10| Billing plans| Afeela| Pending| Not started| 
F11| Plan quantity and availability| Afeela| Pending| Not started| 
F12| Plan lifecycle policies| Navaneed + Afeela| Pending| Not started| 
F13| Quotation templates| Shehruz + Afeela| Pending| Not started| 
F14| Quotation validity| Navaneed + Shehruz| Pending| Not started| 
F15| Subscription details| Navaneed + Afeela| Pending| Not started| 
F16| Subscription lines and amounts| Navaneed + Afeela| Pending| Not started| 
F17| Subscription lifecycle| Navaneed| Pending| Not started| 
F18| Subscription status visibility| Shehruz + Navaneed| Pending| Not started| 
F19| Invoice generation| Navaneed| Pending| Not started| 
F20| Invoice details and totals| Navaneed + Afeela| Pending| Not started| 
F21| Invoice lifecycle and balances| Navaneed| Pending| Not started| 
F22| Invoice actions| Navaneed + Shehruz| Pending| Not started| 
F23| Duplicate/skipped billing prevention| Navaneed + Afeela| Pending| Not started| 
F24| Discount management| Navaneed + Afeela| Pending| Not started| 
F25| Discount thresholds| Navaneed| Pending| Not started| 
F26| Discount validity and usage limits| Navaneed + Afeela| Pending| Not started| 
F27| Discount scope| Navaneed + Afeela| Pending| Not started| 
F28| Automatic discount application| Navaneed| Pending| Not started| 
F29| Discount expiry| Navaneed| Pending| Not started| 
F30| Payment recording| Navaneed| Pending| Not started| 
F31| Paid/outstanding invoice visibility| Navaneed + Shehruz| Pending| Not started| 
F32| Overdue invoice follow-up| Navaneed + Shehruz| Pending| Not started| 
F33| Active subscription finance view| Navaneed| Pending| Not started| 
F34| Revenue and payment view| Navaneed| Pending| Not started| 
F35| Outstanding and overdue view| Navaneed| Pending| Not started| 
F36| Dashboard filters and summary| Shehruz + Navaneed| Pending| Not started| 

Non-Functional Requirements

ID| Requirement| Owner| Implementation / PR| Evidence / Status| Open question
N01| Performance under 2 seconds| Afeela + Navaneed| Pending| Not started| 
N02| Reliable billing| Navaneed + Afeela| Pending| Not started| 
N03| Role and customer-data security| Afeela| Pending| Not started| 
N04| Financial calculation correctness| Navaneed + Afeela| Pending| Not started| 
N05| Usability and responsiveness| Shehruz| Pending| Not started| 
N06| Maintainable and scalable architecture| Navaneed + Afeela| Pending| Not started| 

Verification Rule

A requirement must not be marked Verified without a test result, PR/commit reference, or screenshot/output supporting it.
