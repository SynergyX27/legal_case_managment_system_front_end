# LegalFlow prototype — single-company workspace

## Run locally

Extract into a new folder, run `npm install`, then `npm run dev`. Use Node.js 22.12+ or 24 and open the printed localhost URL. `npm test` runs the automated suite and `npm run build` creates a production build. This is a TanStack Start application, not a plain static SPA.

The blue theme and locally included Inter font work without external font services or a font package. Keep `public/fonts` in the project.

## One company

The workspace represents one company. Organization switching, organization selection on customer forms and organization metrics are removed. All customer profiles, staff, users and case files belong to the same internal company record. Existing browser data migrates without changing case IDs, client IDs, staff assignments, invoices, messages or attachments. Owners see all company cases; managers and staff retain assigned-case visibility; customers see their own cases only.

## Demo login

| Role     | Username (fresh demo data) | Email                   | Password    |
| -------- | -------------------------- | ----------------------- | ----------- |
| Owner    | owner                      | owner@legalflow.demo    | password123 |
| Manager  | manager                    | manager@legalflow.demo  | password123 |
| Staff    | staff                      | staff@legalflow.demo    | password123 |
| Customer | customer                   | customer@legalflow.demo | password123 |

You can sign in with username or email. Existing migrated users without a chosen password retain the previous password123 demo login; their initial username may be their email. New accounts use the username and password chosen during creation. Passwords are stored as salted PBKDF2 hashes in browser storage. This remains simulated browser authentication, not a secure production backend. Use test credentials.

## People & access — owner only

- **Add user** creates an owner, manager, staff member or customer with name, email, username and password. Internal users may include a job title and phone number.
- **Add customer** asks for customer name, email, phone, address, username, password and password confirmation in one continuous form. There is no business/company field or separate login-access section.
- To give an existing customer profile a login, choose it from Customer profile. The form preloads its details and keeps its existing case links. A customer profile has one login in this prototype.
- **Manage access** lets the owner change internal roles, activate/deactivate users and set a new password. Customer profiles remain customers; they cannot be converted into internal users. Owners cannot deactivate or demote themselves.
- Passwords are not displayed later. The owner should provide the username and the password they chose to the customer. No email, invitation or notification is actually sent.

## Public customer signup

Create customer account uses the same customer fields and customer creation operation as the owner form. It always creates a customer role, creates the linked customer profile and signs the customer in. Both paths immediately add the customer to the Assigned Customer dropdown when creating a case.

Public registration does not claim an existing customer profile by matching email; the owner must explicitly link an existing profile to a login. Username and email duplicates are rejected. Passwords require at least 8 characters and matching confirmation.

## Company documents — owner only

Company documents is an independent library. Upload files, search by filename, preview supported images/PDFs, download or delete with confirmation. These files are not assigned to cases and never appear in case document lists. Other roles cannot open this page or perform company document mutations.

Uploaded files persist in the same browser after reload. The prototype shares a 2 MB upload budget across case attachments and company documents. Real file storage will be implemented with the backend.

## Case files and invoices

Customers from owner creation or public signup are selected through Assigned Customer on the case form. Staff and managers can also be assigned. Case detail pages show the customer, property fields, schedule, invoices and case team. Financial amounts are entered in invoices rather than the case form. A case can have many invoices.

| Field                            | Meaning in this prototype                                           |
| -------------------------------- | ------------------------------------------------------------------- |
| REF / Case Number / Plaintiff    | Reference, unique case number and separate plaintiff text           |
| Tenant / Address                 | Resident name and property address                                  |
| County / City / State / Zip      | Separate text fields; leading zeros in Zip are preserved            |
| Setout Date / Time               | Service schedule used by the calendar                               |
| Status                           | Active, Pending, Scheduled, Completed or Cancelled                  |
| VIS - LO / VIS - TO / LOCS / LBX | Optional tracking text; business meanings await client confirmation |
| Last payment                     | Most recently recorded paid service invoice amount/date             |
| Balance owed                     | Issued unpaid service invoices including tax, excluding drafts      |

These balances describe service invoices, not tenant rent arrears. Payments record full-invoice status changes only; no payment is actually processed. Customers can view their cases and issued invoices but cannot edit invoices/cases or read internal notes.

## Messaging

Use the bottom-right bubble or Message beside your case team. Messages and People tabs support allowed contacts, unread counts, multiline drafts, Enter to send, Escape to close and expansion into the full inbox. Drafts survive popup closing within the session but not a full refresh. On the full Messages page use Open chat popup; the closed launcher is hidden there to keep the composer clear on phones.

Owner can message anyone. Internal colleagues can message one another within this company; customers can message their assigned staff/manager and the owner. Messages persist locally. Switch accounts in the same browser to test replies; live multi-user messaging is future work.

## Basic reports

Owners and managers can view visible-case status totals, completion rate, staff workload, customer summaries and invoice status totals, with CSV export. Draft invoices are excluded from outstanding balances. AI Insights and Automations remain removed. Settings and the standalone notification center remain planned sections.

## Validation and prototype scope

Tests cover case and billing helpers, reports, role visibility, messaging, single-company migration, chosen credentials, owner-only user creation, owner-only company documents and shared customer creation. Desktop/mobile browser checks cover creating customers and staff, uploading/downloading/deleting company documents, persistence after reload, case assignment, customer username login and public signup.

The app still uses browser localStorage for data, accounts, sessions, messages and uploads. It has no backend database, production authentication, real email delivery, payment integration or live multi-user sync yet.

## Login and registration design

The entry screen uses a custom courthouse-inspired architectural image, a navy photo panel and a focused white sign-in/create-account area. A compact image banner remains visible on phones. Demo login shortcuts are inside Explore demo accounts. Normal login fields start empty. Customer registration and the owner customer form use one continuous set of fields with no business/company input or separate login-access panel. Existing customer business metadata is retained internally for compatibility. Validation errors appear beside the form; username/password authentication and customer creation are unchanged.


## Light and dark appearance

Use the sun/moon button in the workspace header or at the top of the login/registration page. The selection applies to forms, tables, reports, chat, notifications/toasts and entry pages. It persists in this browser independently of the demo account and syncs across tabs. Before an explicit choice, the app follows the device light/dark preference. The saved appearance is applied before page hydration to reduce light-mode flashing.

Theme checks cover mode switching, saved preferences, cross-tab synchronization, system preference, desktop/mobile views and modal/chat appearance. The current automated suite has 41 passing tests.
