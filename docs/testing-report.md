# BIKA WUNGUKE — Testing Report

**Bika neza. Cunga neza. Wunguke kurushaho.**

This report describes the testing strategy and the manual test cases used to verify the
BIKA WUNGUKE application.

---

## 1. Scope

Testing covers the four main areas of the application:

1. **Authentication** — registration, sign-in, session handling, password change.
2. **Records** — income and expense CRUD, filters, search, pagination.
3. **Savings** — deposits, withdrawals, sums and balance.
4. **Dashboards & reports** — summaries, charts, CSV/PDF export.

Both the **backend API** and the **frontend UI** are exercised.

---

## 2. Test types

| Type              | What it covers                                             |
| ----------------- | ---------------------------------------------------------- |
| Static checks     | TypeScript type-checking (`npm run typecheck`) both packages |
| API testing       | REST endpoints via an HTTP client / curl                    |
| Functional (UI)   | Manual end-to-end walkthroughs of each screen               |
| Validation        | Invalid inputs are rejected with helpful messages           |
| Responsive        | Layouts on desktop and mobile widths                        |
| Security          | Access control, password hashing, query scoping             |

---

## 3. Environment

- Node.js 18+ (development used Node 25)
- MySQL 8 / MariaDB 10.3+ (development used MariaDB via XAMPP)
- Browsers: Chrome, Edge, Firefox (latest)
- Devices/viewports: desktop (1440px) and mobile (375px)

---

## 4. How to reproduce

```bash
# Static checks
cd backend  && npm run typecheck && npm run build
cd frontend && npm run typecheck && npm run build

# Run the stack
cd backend  && npm run dev     # http://localhost:4000
cd frontend && npm run dev     # http://localhost:5173
```

---

## 5. Authentication test cases

| # | Test                                   | Expected result                                     | Status |
|---|----------------------------------------|-----------------------------------------------------|--------|
| A1 | Register with valid details            | Account created, redirected to dashboard, JWT stored | Pass |
| A2 | Register with an existing phone        | `409` — "An account with this phone number already exists." | Pass |
| A3 | Register with short password           | `400` — validation error on password                | Pass |
| A4 | Register with invalid phone            | `400` — "Enter a valid Rwandan phone number"        | Pass |
| A5 | Login with correct credentials         | Signed in, redirected to dashboard                  | Pass |
| A6 | Login with wrong password              | `401` — "Wrong phone number or password."           | Pass |
| A7 | Access a protected page while signed out | Redirected to `/login`                            | Pass |
| A8 | Access a public auth page while signed in | Redirected to `/dashboard`                       | Pass |
| A9 | Expired/invalid token                  | `401`, token cleared, redirected to `/login`        | Pass |
| A10 | Change password with wrong current pw | `400` — "Current password is incorrect."            | Pass |
| A11 | Change password successfully          | `200`, new password works at next sign-in           | Pass |
| A12 | Register with business location, description, category and language | Values saved and shown on the record page | Pass |
| A13 | Update business profile in Settings   | Category, location, description and language updated | Pass |

---

## 6. Records test cases

| # | Test                                    | Expected result                                    | Status |
|---|-----------------------------------------|----------------------------------------------------|--------|
| R1 | Add an income record                    | Saved, appears in list and dashboard totals        | Pass |
| R2 | Add an expense record                   | Saved, appears in list and dashboard totals        | Pass |
| R3 | Amount = 0 or empty                     | Validation error, record not saved                 | Pass |
| R4 | Amount = negative                       | Rejected by validation                             | Pass |
| R5 | Future date                             | Prevented by the date picker (`max = today`)       | Pass |
| R6 | Filter by type                          | Only matching records shown                        | Pass |
| R7 | Filter by category                      | Only matching records shown                        | Pass |
| R8 | Filter by date range                    | Only records in range shown                        | Pass |
| R9 | Search description                      | Only matching records shown (debounced)            | Pass |
| R10 | Edit a record                          | Values updated everywhere                          | Pass |
| R11 | Delete a record                        | Record removed after confirmation                  | Pass |
| R12 | Pagination                             | Page navigation and totals are correct             | Pass |
| R13 | Category from another user             | Rejected (`400`) — cannot attach foreign category  | Pass |
| R14 | Access another user's record by id     | `404` — not found (query scoped by user_id)        | Pass |
| R15 | Create a record without a category     | `400` — "Please choose a category"                 | Pass |
| R16 | New account category suggestions       | Nine default income/expense categories present     | Pass |

---

## 7. Savings test cases

| # | Test                          | Expected result                              | Status |
|---|-------------------------------|----------------------------------------------|--------|
| S1 | Add a deposit                 | Saved; balance increases                     | Pass |
| S2 | Add a withdrawal              | Saved; balance decreases                     | Pass |
| S3 | Balance calculation           | deposits − withdrawals = balance             | Pass |
| S4 | Edit a savings record         | Values updated; balance recalculated         | Pass |
| S5 | Delete a savings record       | Removed; balance recalculated                | Pass |
| S6 | Amount = 0                    | Validation error                             | Pass |

---

## 8. Dashboard & reports test cases

| # | Test                              | Expected result                                | Status |
|---|-----------------------------------|------------------------------------------------|--------|
| D1 | Summary totals                    | Match the sum of recorded transactions         | Pass |
| D2 | Net cash flow                     | income − expenses, coloured by sign            | Pass |
| D3 | Trend chart (30 days)             | Continuous series, no gaps on empty days       | Pass |
| D4 | Category breakdown                | Matches expense records by category            | Pass |
| D5 | Monthly chart (6 months)          | Continuous series across months                | Pass |
| D6 | Empty state (no data)             | Friendly empty states shown, no crashes        | Pass |
| D7 | Export CSV                        | Downloads; opens correctly; totals at bottom   | Pass |
| D8 | Export PDF                        | Downloads; shows header, totals and rows       | Pass |
| D9 | Report date range filter          | Only records in range are included             | Pass |
| D10 | Dashboard period — This week     | Totals and chart cover Monday–today            | Pass |
| D11 | Dashboard period — This month    | Totals and chart cover 1st–today               | Pass |
| D12 | Dashboard period — Custom range  | Totals and chart respect the chosen From/To    | Pass |
| D13 | Recent transactions list         | Shows the five latest records, newest first    | Pass |
| D14 | Savings goal progress            | Bars reflect deposits minus withdrawals per goal | Pass |
| D15 | My Financial Record statement    | All-time totals + income/expense category tables render | Pass |
| D16 | Net cash flow explanation        | Note clarifies figure comes only from recorded transactions | Pass |

---

## 9. Cross-cutting test cases

| # | Test                          | Expected result                                  | Status |
|---|-------------------------------|--------------------------------------------------|--------|
| X1 | Responsive — mobile 375px     | Sidebar becomes a drawer; tables become cards    | Pass |
| X2 | Responsive — desktop 1440px   | Full sidebar and tables visible                  | Pass |
| X3 | Invalid/expired session       | Graceful redirect to sign-in                     | Pass |
| X4 | Server error handling         | Friendly toast; no crash; console logs the error | Pass |
| X5 | Duplicate category name+type  | `409` conflict message                           | Pass |
| X6 | Currency formatting           | Amounts shown with the user's currency           | Pass |
| X7 | Preferred language saved      | Language stored on the profile and shown on record page | Pass |
| X8 | Menu completeness             | Dashboard, Transactions, Savings, Reports, My Financial Record, Settings, Logout shown; no unfinished pages | Pass |

---

## 10. Security checks

| # | Check                                              | Result |
|---|----------------------------------------------------|--------|
| 1 | Passwords stored as bcrypt hashes (never plain)    | Pass   |
| 2 | JWT required for all private endpoints             | Pass   |
| 3 | All queries scoped by `user_id` (no cross-user access) | Pass |
| 4 | SQL uses parameterised queries (`?` placeholders)  | Pass   |
| 5 | Request payloads validated with Zod                | Pass   |
| 6 | CORS restricted to `CLIENT_ORIGIN`                 | Pass   |

---

## 11. Known limitations & future work

- No automated test suite is included in this prototype; testing was manual plus static
  type-checking.
- No password-reset / OTP flow yet.
- No multi-user / staff accounts per business.
- No offline storage or sync.

Planned improvements: automated unit/integration tests, password reset via SMS, Kinyarwanda/
English language toggle, and offline support.

---

## 12. Conclusion

All planned functional test cases passed. The application correctly records income, expenses and
savings, computes period-based summaries, renders charts, tracks savings goals, presents a complete
financial record, and exports CSV/PDF reports, while protecting each user's data through
authentication, validation and per-user query scoping.

---

*BIKA WUNGUKE — Bika neza. Cunga neza. Wunguke kurushaho.*
