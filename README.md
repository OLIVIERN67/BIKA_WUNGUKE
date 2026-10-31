# BIKA WUNGUKE

**Bika neza. Cunga neza. Wunguke kurushaho.**

A simple cash-flow and record-keeping tool for small traders in Rwanda. BIKA WUNGUKE helps
self-employed micro-traders and owners of small informal businesses record their daily business
income, expenses and savings, understand their recorded cash flow, and generate financial
summaries they can review or share.

> Target country: **Rwanda** · Primary users: **micro-traders with limited digital skills**

---

## Table of contents

1. [Features](#features)
2. [Technology stack](#technology-stack)
3. [Project structure](#project-structure)
4. [Getting started](#getting-started)
5. [Environment variables](#environment-variables)
6. [API overview](#api-overview)
7. [Documentation](#documentation)
8. [Scripts](#scripts)

---

## Features

- **User accounts** — register with a Rwandan phone number, email and password, then sign in with
  your phone and password (JWT auth).
- **Email verification (OTP)** — sign in with your phone and password and a 6-digit code is emailed
  to your registered address. Enter it on the verification screen to finish signing in (the screen
  appears automatically and the code can be resent).
- **Forgot / reset password** — email-based password recovery with a single-use, 30-minute reset
  link (no account enumeration, rate limited, all sessions invalidated on reset).
- **Business profile** — capture business name, category, location, description, preferred language
  and currency.
- **Income & expense records** — add, edit, delete, filter and search daily records, each grouped
  under a required category.
- **Categories** — organise records with colour-coded income/expense categories (sensible defaults
  are created for every new user).
- **Savings** — track deposits and withdrawals, set simple goals, and see your savings balance.
- **Dashboard** — period totals (This week / This month / Custom), net cash flow, savings goals,
  recent transactions and interactive charts (cash-flow area chart, expense breakdown by category).
- **My Financial Record** — a full statement with an overall position and income/expense breakdown
  by category.
- **Reports** — review records for a date range and **export to CSV or PDF**.
- **Responsive, mobile-first UI** — built to be usable on the phones traders actually use.
- **Settings** — manage profile, business details, language, currency and password.

---

## Technology stack

| Layer     | Technology                                                                 |
| --------- | -------------------------------------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Lucide    |
| Backend   | Node.js, Express, TypeScript, REST API, Zod validation                     |
| Database  | PostgreSQL (via `pg`) - Neon-compatible                                   |
| Extras    | JWT authentication, CSV + PDF export, environment variables                |

---

## Project structure

```
bika-wunguke/
├── frontend/                # React + Vite client
│   ├── src/
│   │   ├── components/      # Reusable UI + feature components
│   │   ├── pages/           # Route pages
│   │   ├── layouts/         # App + Auth layouts
│   │   ├── services/        # API client layer
│   │   ├── hooks/           # Custom hooks
│   │   ├── types/           # Shared TypeScript types
│   │   ├── utils/           # Formatting/date helpers
│   │   ├── context/         # Auth context
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   └── .env.example
├── backend/                 # Express + TypeScript API
│   ├── src/
│   │   ├── config/          # env + database pool + db init script
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # auth, validation, error handling
│   │   ├── routes/          # REST routes
│   │   ├── services/        # Business logic + SQL
│   │   ├── validators/      # Zod schemas
│   │   ├── utils/           # helpers
│   │   ├── types/
│   │   ├── tests/           # Vitest + Supertest suites
│   │   └── server.ts
│   ├── database/
│   │   ├── schema.sql
│   │   └── migrations/      # Idempotent SQL migrations
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── user-guide.md
│   ├── technical-documentation.md
│   └── testing-report.md
├── README.md
└── .gitignore
```

---

## Getting started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (local or hosted, e.g. Neon)

### 1. Clone and install

```bash
git clone <your-repo-url> bika-wunguke
cd bika-wunguke

# backend
cd backend
npm install
cp .env.example .env      # then edit .env with your PostgreSQL credentials

# frontend
cd ../frontend
npm install
cp .env.example .env
```

### 2. Create the database

```bash
cd backend
npm run db:init
```

This applies `database/schema.sql` and all migrations to the PostgreSQL database configured in `.env`.

### 3. Run the backend

```bash
cd backend
npm run dev
# API at http://localhost:4000  (health: /api/health)
```

### 4. Run the frontend

```bash
cd frontend
npm run dev
# App at http://localhost:5173
```

The Vite dev server proxies `/api` to the backend, so no CORS setup is needed in development.

---

## Environment variables

### Backend (`backend/.env`)

| Variable        | Description                          | Default                 |
| --------------- | ------------------------------------ | ----------------------- |
| `PORT`          | API port                             | `4000`                  |
| `PGHOST`        | PostgreSQL host                      | `localhost`             |
| `PGPORT`        | PostgreSQL port                      | `5432`                  |
| `PGUSER`        | PostgreSQL user                      | `postgres`              |
| `PGPASSWORD`    | PostgreSQL password                  | —                       |
| `PGDATABASE`    | Database name                        | `bika_wunguke`          |
| `PGSSLMODE`     | SSL mode (`require` for Neon)        | `prefer`                |
| `PGCHANNELBINDING` | Channel binding (`require` for Neon) | `prefer`             |
| `PGSCHEMA`      | Schema used by the app               | `public`                |
| `JWT_SECRET`    | Secret for signing JWTs              | — (set a long value)    |
| `JWT_EXPIRES_IN`| Token lifetime                       | `7d`                    |
| `TRUST_PROXY`   | Trusted reverse-proxy hops (rate limiting) | `1` in production  |
| `CLIENT_ORIGIN` | Allowed frontend origin(s)           | `http://localhost:5173` |
| `FRONTEND_URL`  | Base URL used in reset links         | `http://localhost:5173` |
| `SMTP_HOST`     | SMTP server host                     | — (required for email)  |
| `SMTP_PORT`     | SMTP server port                     | `587`                   |
| `SMTP_SECURE`   | `true` for TLS (port 465)            | `false`                 |
| `SMTP_USER`     | SMTP username                        | —                       |
| `SMTP_PASSWORD` | SMTP password / app password         | —                       |
| `EMAIL_FROM`    | From address for outgoing mail       | — (required for email)  |

### Frontend (`frontend/.env`)

| Variable            | Description                          | Default |
| ------------------- | ------------------------------------ | ------- |
| `VITE_API_BASE_URL` | Base URL of the API                  | `/api`  |
| `VITE_APP_NAME`     | App display name                     | `BIKA WUNGUKE` |

### Vercel deployment

Connect the repository to Vercel with the **Root Directory set to the repository root** (not
`frontend`). Keep the production branch set to `main` and let the checked-in `vercel.json` build
the frontend and route `/api/*` to the Express function. The frontend uses the same-origin `/api`
path by default, so `VITE_API_BASE_URL` does not need to contain a hardcoded deployment URL.

Add these variables in Vercel for Production (and Preview too if preview deployments should use
the live database):

- `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, and `PGSSLMODE=require` from Neon.
- `JWT_SECRET` set to a unique random value of at least 32 characters.
- `CLIENT_ORIGIN=https://bika-wunguke.vercel.app` and
  `FRONTEND_URL=https://bika-wunguke.vercel.app`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` so OTP
  verification and password reset emails can be delivered.

Vercel injects these values into `process.env` for the function; database credentials and the JWT
secret must not use a `VITE_` prefix. After changing the Vercel settings, redeploy the `main` branch.

---

## Password reset

### Flow

1. The user opens **Sign in → "Forgot password?"**, enters their email and submits.
2. `POST /api/auth/forgot-password` always answers with the same generic message — the API never
   reveals whether an account exists for that address.
3. If an account exists, a link like
   `http://localhost:5173/reset-password?token=<base64url>` is emailed using the SMTP settings
   above. Only the **SHA-256 hash** of the token is stored (`password_reset_tokens`); the raw
   token is never stored or logged.
4. The user opens the link (`/reset-password` validates it via
   `POST /api/auth/validate-reset-token`), chooses a new password and submits.
5. `POST /api/auth/reset-password` consumes the token and, in one transaction: updates the
   password, marks the token used, invalidates every other outstanding token for that account and
   bumps `users.token_version` — so **all previously issued JWTs stop working** and the user must
   sign in again.

Security properties: 30-minute expiry, single use, rate limiting (5 requests / 15 min per
IP+email on forgot-password, 30 / 15 min per IP on reset & validate), `crypto`-random
32-byte tokens, password policy of 12–128 characters shared with register/change-password, and
a safe generic response even when email delivery fails.

### Email setup

Fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` and `EMAIL_FROM`
in `backend/.env`, then restart the backend. Without these values the endpoint still returns the
generic success message, but no email is sent (the failure is logged without the token).

### Running the reset tests

```bash
cd backend
npm test        # or: npm run test:watch
```

The suite runs against a dedicated `bika_wunguke_test` database (recreated from
`database/schema.sql` + migrations on every run — the development database is never touched) and
mocks the mailer, so no SMTP server is required. It covers the full happy path
(register → forgot → emailed link → reset → old password rejected / new password accepted) plus
enumeration, invalid/expired/used tokens, multi-token invalidation, JWT invalidation, rate
limiting, email-failure handling and token-hash storage.

---

## Email verification

### Flow

1. The user registers via **Create account**, providing a full name, phone number, **email** and
   password (confirmed twice).
2. `POST /api/auth/register` creates the account with `email_verified = 0` and emails a
   **6-digit one-time code (OTP)** to the address just registered. No session/JWT is issued yet.
   The response includes `otpSent` so the client only claims success when the mail server
   accepted the message.
3. The app navigates automatically to `/verify-email`, where the registered email is already
   known — the user is never asked to type it again.
4. The user signs in with **phone + password** (`POST /api/auth/login`). After the password is
   valid, the backend emails a **fresh** code to the registered address for every sign-in,
   regardless of whether the address was already verified, and returns
   `{ verificationRequired: true, otpSent, maskedEmail }` — **no token**. The app then shows
   `/verify-email`, displaying the masked address (e.g. `ol***@gmail.com`).
5. `POST /api/auth/verify-email` checks the code. The account can be identified by **email or
   phone number**, so the sign-in flow (which knows only the phone) never re-asks for the email.
   On success the account is activated **and a session token is issued**, so the user lands on the
   dashboard already signed in.
6. `POST /api/auth/resend-otp` issues a fresh code (invalidating the previous one) after the
   resend cooldown, again identified by email or phone.

Wrong credentials always return **`401`** and never trigger an email. An account with no email on
file cannot receive a code and is rejected with **`403`**. No session token is ever issued before
OTP verification, and protected routes additionally require a verified account (defence in depth).

Security properties: `crypto`-secure 6-digit codes, **5-minute expiry**, **60-second resend
cooldown**, **max 5 attempts** per code, each new code invalidates the previous one, single use,
and only an **HMAC-SHA256 hash** (keyed by `JWT_SECRET`, bound to the user id) is stored in
`email_otp` — the raw code is never stored, returned in a response, or written to a log.
Verification endpoints are rate limited and the stored hash is compared in constant time.

### Delivery & error handling

The mailer retries on transient socket failures (a dropped STARTTLS socket is common on
port 587), forces IPv4 and defaults to implicit TLS on **port 465**, and only reports success once
the server **accepts** the message. If delivery fails, the just-created code is removed (so the
cooldown does not block an immediate retry) and the outcome is reported honestly:

- **Registration** still succeeds (the account exists) but returns `otpSent: false`; the client
  shows a warning and offers **Resend code** rather than a false success.
- **Login** still moves the user to the verification screen with `otpSent: false`, so they can
  retry or **Resend code** instead of being falsely told a code was sent.
- **Resend** returns a clear `500` error so the user knows to try again.

The raw OTP is never logged — only a safe error code/message is recorded server-side.

### Email setup

Email verification shares the same SMTP settings as password reset. In `backend/.env` set:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465          # 465 = implicit TLS (recommended); 587 = STARTTLS
SMTP_SECURE=true       # true for 465, false for 587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your_app_password   # a Gmail App Password, not your login password
EMAIL_FROM=you@gmail.com
EMAIL_FROM_NAME=BIKA WUNGUKE      # friendly sender name
EMAIL_REPLY_TO=                   # optional; defaults to EMAIL_FROM
```

Then restart the backend. Notes:

- **Use an App Password.** Gmail requires 2‑Step Verification and an
  [App Password](https://myaccount.google.com/apppasswords) — your normal password will be
  rejected.
- **Port 465 is recommended.** STARTTLS on 587 commonly times out on some networks; the mailer
  also forces IPv4 and retries transient failures, but 465 is the most reliable.
- **Check Spam.** Mail sent from a personal Gmail address is often filtered; for production use a
  domain with SPF/DKIM and a transactional provider.
- A safe delivery trace (`[email] verification OTP accepted for delivery to …`) is logged — never
  the OTP.

---

## API overview

Base path: `/api`

| Method | Endpoint                     | Description                          | Auth |
| ------ | ---------------------------- | ------------------------------------ | ---- |
| GET    | `/health`                    | Service health check                 | No   |
| POST   | `/auth/register`             | Create account (emails an OTP)       | No   |
| POST   | `/auth/verify-email`         | Verify account with the emailed code | No   |
| POST   | `/auth/resend-otp`           | Resend a verification code           | No   |
| POST   | `/auth/login`                | Sign in                              | No   |
| GET    | `/auth/me`                   | Current user profile                 | Yes  |
| PUT    | `/auth/me`                   | Update profile                       | Yes  |
| PUT    | `/auth/change-password`      | Change password                      | Yes  |
| POST   | `/auth/forgot-password`      | Request a password-reset email       | No   |
| POST   | `/auth/reset-password`       | Set a new password with a token      | No   |
| POST   | `/auth/validate-reset-token` | Check a reset token before use       | No   |
| GET    | `/transactions`              | List records (filters + pagination)  | Yes  |
| POST   | `/transactions`              | Create record                        | Yes  |
| GET    | `/transactions/:id`          | Get record                           | Yes  |
| PUT    | `/transactions/:id`          | Update record                        | Yes  |
| DELETE | `/transactions/:id`          | Delete record                        | Yes  |
| GET    | `/categories`                | List categories                      | Yes  |
| POST   | `/categories`                | Create category                      | Yes  |
| PUT    | `/categories/:id`            | Update category                      | Yes  |
| DELETE | `/categories/:id`            | Delete category                      | Yes  |
| GET    | `/savings`                   | List savings                         | Yes  |
| POST   | `/savings`                   | Create savings record                | Yes  |
| GET    | `/savings/summary`           | Savings totals                       | Yes  |
| PUT    | `/savings/:id`               | Update savings record                | Yes  |
| DELETE | `/savings/:id`               | Delete savings record                | Yes  |
| GET    | `/dashboard/summary`         | Cash-flow summary                    | Yes  |
| GET    | `/dashboard/trend`           | Daily trend (`?days=30`)             | Yes  |
| GET    | `/dashboard/monthly`         | Monthly trend (`?months=6`)          | Yes  |
| GET    | `/dashboard/categories`      | Category breakdown (`?type=expense`) | Yes  |
| GET    | `/reports`                   | Report JSON for a range              | Yes  |
| GET    | `/reports/csv`               | Download CSV                         | Yes  |
| GET    | `/reports/pdf`               | Download PDF                         | Yes  |

---

## Documentation

- [User guide](docs/user-guide.md)
- [Technical documentation](docs/technical-documentation.md)
- [Testing report](docs/testing-report.md)

---

## Scripts

### Backend

| Script            | Description                       |
| ----------------- | --------------------------------- |
| `npm run dev`     | Start with hot reload             |
| `npm run build`   | Compile TypeScript to `dist/`     |
| `npm start`       | Run compiled server               |
| `npm run typecheck` | Type-check without emitting     |
| `npm run db:init` | Create DB + apply schema          |
| `npm run db:migrate` | Apply pending migrations only   |
| `npm test`        | Run the test suite (Vitest)       |
| `npm run test:watch` | Run tests in watch mode         |

### Frontend

| Script            | Description                       |
| ----------------- | --------------------------------- |
| `npm run dev`     | Start Vite dev server             |
| `npm run build`   | Type-check + production build     |
| `npm run preview` | Preview production build          |
| `npm run typecheck` | Type-check without emitting     |
| `npm run lint`    | Lint with ESLint                   |
