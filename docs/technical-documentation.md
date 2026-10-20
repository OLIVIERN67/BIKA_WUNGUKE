# BIKA WUNGUKE — Technical Documentation

**Bika neza. Cunga neza. Wunguke kurushaho.**

This document describes the architecture, data model, API, and key implementation decisions of
the BIKA WUNGUKE application.

---

## 1. Overview

BIKA WUNGUKE is a full-stack web application composed of three separate parts:

- **frontend** — a React + TypeScript single-page application.
- **backend** — an Express + TypeScript REST API.
- **database** — a MySQL relational database.

Development is simple and pragmatic: the Vite dev server proxies `/api` requests to the backend,
and the backend talks to MySQL.

```
Browser (React SPA)
        │  HTTP/JSON  (JWT in Authorization header)
        ▼
Express REST API  ──►  MySQL  (users, categories, transactions, savings)
```

---

## 2. Architecture

### 2.1 Layered backend

The backend follows a clear separation of concerns:

| Layer         | Folder                | Responsibility                                |
| ------------- | --------------------- | --------------------------------------------- |
| Routes        | `src/routes`          | Map HTTP verbs/paths to controllers           |
| Controllers   | `src/controllers`     | Read request, call service, send response     |
| Services      | `src/services`        | Business logic and SQL queries                |
| Validators    | `src/validators`      | Zod schemas for request payloads              |
| Middleware    | `src/middleware`      | Auth, validation, error handling              |
| Config        | `src/config`          | Environment + MySQL connection pool           |

Request flow: **route → middleware (auth/validation) → controller → service → MySQL**, with errors
funnelled through a single error-handling middleware.

### 2.2 Response envelope

All JSON responses use a consistent envelope:

```json
{ "success": true, "message": "optional", "data": { } }
```

Errors:

```json
{ "success": false, "message": "Something went wrong", "details": [] }
```

### 2.3 Frontend structure

| Area        | Folder              | Responsibility                              |
| ----------- | ------------------- | ------------------------------------------- |
| Pages       | `src/pages`         | One component per route                     |
| Layouts     | `src/layouts`       | Authenticated shell + public auth shell     |
| Components  | `src/components`    | Reusable UI and feature components          |
| Services    | `src/services`      | Axios instance + typed API calls            |
| Context     | `src/context`       | `AuthContext` (session state)               |
| Hooks       | `src/hooks`         | Reusable hooks (e.g. `useDebounce`)         |
| Utils       | `src/utils`         | Formatting and date helpers                 |

---

## 3. Data model

### 3.1 Entity relationship (textual)

```
users (1) ───< categories (n)
users (1) ───< transactions (n) >─── (0..1) categories
users (1) ───< savings (n)
```

### 3.2 Tables

#### `users`

| Column        | Type           | Notes                        |
| ------------- | -------------- | ---------------------------- |
| id            | INT UNSIGNED PK | auto-increment              |
| full_name     | VARCHAR(120)   | required                     |
| phone         | VARCHAR(20)    | unique, sign-in identifier   |
| email         | VARCHAR(160)   | unique, optional             |
| password_hash | VARCHAR(255)   | bcrypt hash                  |
| business_name | VARCHAR(160)   | optional                     |
| business_type | VARCHAR(120)   | optional — stores the business **category** |
| business_location | VARCHAR(160) | optional                  |
| business_description | VARCHAR(255) | optional               |
| currency      | CHAR(3)        | default `RWF`                |
| locale        | VARCHAR(10)    | default `rw`                 |
| created_at    | TIMESTAMP      |                              |
| updated_at    | TIMESTAMP      |                              |

#### `categories`

| Column     | Type                          | Notes                         |
| ---------- | ----------------------------- | ----------------------------- |
| id         | INT UNSIGNED PK               |                               |
| user_id    | INT UNSIGNED FK → users.id    | cascade delete                |
| name       | VARCHAR(80)                   | unique per (user_id, name, type) |
| type       | ENUM('income','expense')      |                               |
| color      | VARCHAR(9)                    | hex colour, default `#10b981` |
| created_at | TIMESTAMP                     |                               |

#### `transactions`

| Column         | Type                                        | Notes                    |
| -------------- | ------------------------------------------- | ------------------------ |
| id             | INT UNSIGNED PK                             |                          |
| user_id        | INT UNSIGNED FK → users.id                  | cascade delete           |
| category_id    | INT UNSIGNED FK → categories.id (nullable)  | `ON DELETE SET NULL`; required by the API on create |
| type           | ENUM('income','expense')                    |                          |
| amount         | DECIMAL(14,2)                               | > 0                      |
| description    | VARCHAR(255)                                | optional                 |
| payment_method | ENUM(cash, mobile_money, bank, credit, other) | default `cash`         |
| txn_date       | DATE                                        | user-chosen              |
| created_at     | TIMESTAMP                                   |                          |
| updated_at     | TIMESTAMP                                   |                          |

Indexes: `(user_id, txn_date)`, `(user_id, type)`, `(category_id)`.

#### `savings`

| Column      | Type                                | Notes             |
| ----------- | ----------------------------------- | ----------------- |
| id          | INT UNSIGNED PK                     |                   |
| user_id     | INT UNSIGNED FK → users.id          | cascade delete    |
| type        | ENUM('deposit','withdrawal')        |                   |
| amount      | DECIMAL(14,2)                       | > 0               |
| goal        | VARCHAR(120)                        | optional          |
| note        | VARCHAR(255)                        | optional          |
| saving_date | DATE                                |                   |
| created_at  | TIMESTAMP                           |                   |
| updated_at  | TIMESTAMP                           |                   |

### 3.3 Referential integrity

- Deleting a user cascades to their categories, transactions and savings.
- Deleting a category sets `transactions.category_id` to `NULL` (records are kept).

---

## 4. Authentication & authorization

- Passwords are hashed with **bcryptjs** (10 salt rounds).
- On successful register/login the API issues a **JWT** signed with `JWT_SECRET`, containing the
  user id and phone, expiring per `JWT_EXPIRES_IN` (default 7 days).
- The frontend stores the token in `localStorage` and attaches it as
  `Authorization: Bearer <token>` on every request.
- Protected endpoints run the `requireAuth` middleware, which verifies the token and sets
  `req.user`.
- Every data query is scoped by `user_id`, so users can only ever read or modify their own data.

---

## 5. Validation

Request bodies are validated with **Zod**:

- `registerSchema`, `loginSchema`, `updateProfileSchema`, `changePasswordSchema`
- `createTransactionSchema`, `updateTransactionSchema`, `listTransactionQuerySchema`
- `createSavingsSchema`, `updateSavingsSchema`, `listSavingsQuerySchema`
- `createCategorySchema`, `updateCategorySchema`

Validation errors are normalised by the error middleware into a `400` response with a
field-level `details` array.

---

## 6. API reference

Base URL: `/api`

### Auth

| Method | Path                    | Body / Query                        | Description            |
| ------ | ----------------------- | ----------------------------------- | ---------------------- |
| POST   | `/auth/register`        | `{ full_name, phone, password, ... }` | Create account       |
| POST   | `/auth/login`           | `{ phone, password }`               | Sign in                |
| GET    | `/auth/me`              | —                                   | Current profile        |
| PUT    | `/auth/me`              | `{ full_name?, email?, ... }`       | Update profile         |
| PUT    | `/auth/change-password` | `{ current_password, new_password }`| Change password        |

### Transactions

| Method | Path                | Description                                   |
| ------ | ------------------- | --------------------------------------------- |
| GET    | `/transactions`     | List with `type, category_id, from, to, search, page, limit, sort, order` |
| POST   | `/transactions`     | Create                                        |
| GET    | `/transactions/:id` | Get one                                       |
| PUT    | `/transactions/:id` | Update                                        |
| DELETE | `/transactions/:id` | Delete                                        |

### Categories

| Method | Path              | Description     |
| ------ | ----------------- | --------------- |
| GET    | `/categories`     | List (`?type=`) |
| POST   | `/categories`     | Create          |
| PUT    | `/categories/:id` | Update          |
| DELETE | `/categories/:id` | Delete          |

### Savings

| Method | Path               | Description       |
| ------ | ------------------ | ----------------- |
| GET    | `/savings`         | List (`?type=,goal=,from=,to=,page=,limit=`) |
| GET    | `/savings/summary` | Totals + balance  |
| POST   | `/savings`         | Create            |
| PUT    | `/savings/:id`     | Update            |
| DELETE | `/savings/:id`     | Delete            |

### Dashboard

| Method | Path                    | Description                                  |
| ------ | ----------------------- | -------------------------------------------- |
| GET    | `/dashboard/summary`    | Period totals, net cash flow, savings, goals. Query `?from=&to=` (optional) |
| GET    | `/dashboard/trend`      | Daily trend, `?days=30&from=&to=`            |
| GET    | `/dashboard/monthly`    | Monthly trend, `?months=6`                   |
| GET    | `/dashboard/categories` | Breakdown, `?type=expense&from=&to=`         |
| GET    | `/dashboard/recent`     | Latest transactions, `?limit=5`              |
| GET    | `/dashboard/savings-goals` | Per-goal deposit/withdrawal totals        |

### Reports

| Method | Path            | Description                          |
| ------ | --------------- | ------------------------------------ |
| GET    | `/reports`      | JSON rows + totals for a range       |
| GET    | `/reports/csv`  | CSV download                         |
| GET    | `/reports/pdf`  | PDF download (generated with PDFKit) |

---

## 7. Key implementation notes

- **Money storage** — amounts use `DECIMAL(14,2)`; the mysql2 pool is configured with
  `decimalNumbers: true` and `dateStrings: true` to avoid float and timezone surprises.
- **Aggregations** — dashboard totals and breakdowns use conditional SQL `SUM(CASE WHEN ...)`
  grouped by date/category.
- **Trend fill** — the daily/monthly trend services generate a continuous series (including days or
  months with no activity) so charts have no gaps.
- **Reports** — CSV is assembled manually with correct quoting; PDF is streamed with PDFKit and a
  repeated header when it spans multiple pages.
- **Error handling** — `asyncHandler` wraps async controllers so rejected promises reach the central
  error middleware; MySQL duplicate-key errors are mapped to `409`.
- **Default categories** — `seedDefaultCategories` inserts a set of common Rwandan small-business
  categories when a user registers: income (`Sales (Mauzo)`, `Service income (Serivisi)`,
  `Other income (Izindi nzira)`) and expense (`Stock and supplies`, `Transport`, `Rent`, `Utilities`,
  `Business equipment`, `Other costs`).
- **Required category** — `createTransactionSchema` requires a positive `category_id`, so every new
  income/expense record is grouped under a category.
- **Period dashboard** — `/dashboard/summary` and `/dashboard/trend` accept an optional `from`/`to`
  date range; when omitted they default to all time. The frontend offers *This week*, *This month*
  and a *Custom range* picker, and explains that net cash flow is derived only from recorded
  transactions while savings are reported separately.
- **Authentication hardening** — passwords are stored as bcrypt hashes on registration and
  password changes; any legacy plain-text password encountered at login is verified once and then
  upgraded to bcrypt automatically.

---

## 8. Configuration & deployment

Configuration is via environment variables (see `.env.example` in each package).

Suggested deployment:

- **Database** — a managed MySQL instance.
- **Backend** — build with `npm run build` and run `npm start` on a Node host (Render, Railway,
  Fly.io, etc.). Set all `.env` variables.
- **Frontend** — build with `npm run build` and serve the static `dist/` on Netlify, Vercel or any
  static host. Set `VITE_API_BASE_URL` to the deployed API URL and add that origin to the backend
  `CLIENT_ORIGIN`.

### Production checklist

- [ ] Set a strong, unique `JWT_SECRET`.
- [ ] Restrict `CLIENT_ORIGIN` to the real frontend domain.
- [ ] Use a dedicated, least-privilege MySQL user.
- [ ] Enable HTTPS everywhere.
- [ ] Back up the database regularly.

---

*BIKA WUNGUKE — Bika neza. Cunga neza. Wunguke kurushaho.*
