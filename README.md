# AapdaSaathi

Disaster management and emergency assistance platform — built for the **SAARTHI'26 Hackathon**.

> **Status:** Phase 2 complete — PostgreSQL schema (7 tables, Alembic migrations), JWT authentication, role-based access control, profile APIs and frontend auth. Alerts, notifications, responses and volunteer assignment *workflows* (APIs/UI) start in Phase 3; their tables already exist.

## Tech stack

| Layer    | Tools |
|----------|-------|
| Frontend | React 19, Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`), React Router 7, Axios, Lucide React |
| Backend  | Python 3.13, FastAPI, Uvicorn, SQLAlchemy 2, Alembic, Pydantic 2 + pydantic-settings, PyJWT, pwdlib (Argon2id) |
| Database | PostgreSQL 16 |
| Maps     | Leaflet + OpenStreetMap (later phase) |

## Project structure

```
AapdaSaathi/
├── frontend/src/
│   ├── components/   Navbar, ProtectedRoute, RoleBasedRoute, GuestRoute, FormField, AlertBanner, ...
│   ├── context/      AuthProvider (session state), authContext
│   ├── hooks/        useAuth, useApiResource, useApiStatus
│   ├── layouts/      MainLayout
│   ├── pages/        Landing, Login, Register, Resident/Volunteer/Admin dashboards, NotFound
│   ├── services/     api.js (Axios + interceptors), authService, profileService, tokenStorage
│   └── utils/        constants (routes, roles), errors (FastAPI error parsing)
├── backend/
│   ├── alembic/      Migrations (versions/…_initial_schema.py)
│   ├── app/
│   │   ├── api/      Routers: auth, users, residents, volunteers, admin, health; deps.py (auth/RBAC)
│   │   ├── core/     config (env settings), security (hashing, JWT), exceptions
│   │   ├── database/ base.py, connection.py, init_db.py, seed_admin.py
│   │   ├── models/   One file per table + enums.py
│   │   ├── schemas/  Pydantic request/response models
│   │   ├── services/ user_service, profile_service, response_service
│   │   └── main.py
│   └── tests/        pytest (52 tests)
└── .vscode/          Interpreter, tasks (servers, tests, migrate, seed), debugger
```

## Database schema

All enum columns are `VARCHAR` + named `CHECK` constraints (easy to extend via migration). Timestamps are `timestamptz`.

| Table | Key columns & constraints |
|-------|---------------------------|
| `users` | `email` unique (stored lower-case), `role` ∈ ADMIN/RESIDENT/VOLUNTEER (indexed), `password_hash` (Argon2id), `is_active` |
| `resident_profiles` | `user_id` → users **unique** (1:1, `ON DELETE CASCADE`); `state`, `district` required + composite index; `assistance_type` ∈ MOBILITY/VISUAL/HEARING/ELDERLY/OTHER/NONE; age 0–120; lat/lon range checks and "both or neither" |
| `volunteer_profiles` | `user_id` → users unique (1:1); `phone`, `location` required; `availability_status` ∈ AVAILABLE/BUSY/OFFLINE (indexed) |
| `alerts` | `severity` ∈ MINOR/MODERATE/SEVERE/EXTREME (CAP levels); `source` ∈ SACHET/DEMO; `external_alert_id` **unique when present** (NULLs allowed) and **required when source = SACHET**; `status` ∈ ACTIVE/EXPIRED/CANCELLED; `radius_km > 0`; `created_by` → users `ON DELETE SET NULL`; index on (`status`, `expires_at`) |
| `notifications` | `user_id` → users (cascade), `alert_id` → alerts (nullable for system messages); index on (`user_id`, `is_read`) |
| `responses` | **unique (`alert_id`, `resident_id`)** — one response per resident per alert; updates go through `response_service.upsert_response`; index on (`alert_id`, `status`) |
| `volunteer_assignments` | `alert_id`, `resident_id`, `volunteer_id` (FKs, cascade); `status` ∈ PENDING/ACCEPTED/REACHED/RESOLVED; `resident_id <> volunteer_id`; index on (`volunteer_id`, `status`) |

`resident_id` / `volunteer_id` reference `users.id`; the expected role is enforced in the service layer.

## API endpoints

| Method | Path | Access |
|--------|------|--------|
| GET | `/`, `/health` | Public |
| GET | `/health/db` | Public — 503 if the database is unreachable |
| POST | `/api/auth/register` | Public — RESIDENT or VOLUNTEER only (ADMIN → 422) |
| POST | `/api/auth/login` | Public — returns `access_token`, `token_type`, `expires_in`, `role`, `user` |
| GET | `/api/users/me` | Any logged-in user |
| GET / PUT | `/api/residents/profile` | RESIDENT (own profile only) |
| GET / PUT | `/api/volunteers/profile` | VOLUNTEER (own profile only) |
| GET | `/api/admin/users?role=&skip=&limit=` | ADMIN |
| POST | `/api/admin/users` | ADMIN — creates another administrator |

`PUT` profile endpoints are partial updates: only fields in the body change. Interactive docs: http://localhost:8000/docs (click **Authorize** and paste a token from `/api/auth/login`).

Status codes: `401` not logged in / invalid / expired token (`"Token has expired"`), `403` wrong role or disabled account, `409` duplicate email, `422` validation error, `503` database unavailable.

## Prerequisites

- Node.js 20.19+ or 22.12+
- Python 3.11+
- PostgreSQL 15+ (Windows: `winget install PostgreSQL.PostgreSQL.16`)

## First-time setup

### 1. Database

Create a dedicated (non-superuser) role and two databases — one for the app, one for tests:

```sql
-- run in psql as the postgres superuser
CREATE ROLE aapdasaathi LOGIN PASSWORD 'choose-a-strong-password';
CREATE DATABASE aapdasaathi OWNER aapdasaathi;
CREATE DATABASE aapdasaathi_test OWNER aapdasaathi;
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env         # macOS/Linux: cp .env.example .env
```

Edit `backend/.env`:

| Variable | What to set |
|----------|-------------|
| `DATABASE_URL` | `postgresql+psycopg2://aapdasaathi:<password>@localhost:5432/aapdasaathi` |
| `TEST_DATABASE_URL` | Same, but database `aapdasaathi_test` (must differ — tests wipe it). Empty = SQLite |
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(64))"` — the app refuses to start with a missing/short key |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Initial admin (password ≥ 8 chars with a letter and a number) |
| `CORS_ORIGINS` | Frontend origin(s), default `http://localhost:5173` |

Then create the schema and the first administrator:

```bash
python -m app.database.init_db
python -m app.database.seed_admin
```

`init_db` applies all Alembic migrations (`alembic upgrade head`). `seed_admin` is idempotent and refuses to promote an existing non-admin account. After that, admins can create more admins via `POST /api/admin/users`. There is no public way to create an admin.

### 3. Frontend

```bash
cd frontend
npm install
copy .env.example .env         # sets VITE_API_BASE_URL=http://localhost:8000
```

## Running

```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend
npm run dev
```

Open http://localhost:5173. In VS Code: **Terminal → Run Task → Start full stack** (also: *DB: apply migrations*, *DB: seed admin*, *Backend: tests*), or **F5** to debug the backend.

## Migrations

```bash
cd backend
alembic revision --autogenerate -m "describe change"   # after editing models
alembic upgrade head
alembic check                                          # verifies models match the database
```

## Testing

```bash
cd backend
pytest -v
```

Uses `TEST_DATABASE_URL` (PostgreSQL) if set, otherwise a temporary SQLite file. The schema is built by the real Alembic migration, and every table is emptied between tests.

```bash
cd frontend
npm run lint
npm run build
```

## Authentication & token storage

- Passwords are hashed with **Argon2id** (pwdlib). Login takes the same time for unknown emails and wrong passwords, and returns the same message for both.
- Access tokens are **HS256 JWTs** (60 min by default) containing `sub` (user id), `role`, `type`, `iat`, `exp`. On each request the backend re-loads the user, so **deactivating a user or changing their role takes effect immediately**. The role in the token is never trusted for authorization.
- The frontend keeps **only the token** in `sessionStorage`. User details are re-fetched from `/api/users/me` on load. The client logs out automatically when the token expires, and on any `401`.
- **Trade-off:** Web Storage is readable by any JavaScript on the page, so an XSS bug could steal the token. This is **not** as secure as an `HttpOnly` cookie. We accept it because the frontend and API may be deployed on different domains (cross-site cookies are increasingly blocked by browsers), and we mitigate it with short-lived tokens, tab-scoped storage and no third-party scripts. For production on a single domain, move to `HttpOnly; Secure; SameSite` cookies with CSRF protection and refresh-token rotation.
