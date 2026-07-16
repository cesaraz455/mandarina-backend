# Mandarina Backend

Main backend for the **Mandarina** personal finance application.

This is not an auth-only service: it is the central backend that will grow to cover all server-side features of the app. Currently, the only implemented module is **authentication**, which handles the full user identity lifecycle: registration, email verification, login, token rotation, password recovery, and session management. More modules will be added over time.

---

## Tech stack

| Category | Technology |
|---|---|
| Framework | NestJS + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Authentication | Passport + JWT (access + refresh tokens) |
| Email | Resend |
| Validation | class-validator, Joi |
| API docs | Swagger (OpenAPI) |

---

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (local instance or Docker)
- A [Resend](https://resend.com) account and API key for email delivery

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

The required variables are:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (min 32 chars) |
| `RESEND_API_KEY` | Resend API key (starts with `re_`) |
| `EMAIL_FROM` | Sender address for outgoing emails |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID, for Sign-In with Google |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `GOOGLE_CALLBACK_URL` | OAuth redirect URI registered in Google Cloud (defaults to `http://localhost:3000/api/v1/auth/google/callback`) |
| `FRONTEND_URL` | Base URL of the PWA; the Google callback redirects here (defaults to `http://localhost:5173`) |

See `.env.example` for the full list with defaults.

To get a Google client ID/secret: create an OAuth 2.0 Client ID (Web application) in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and add your `GOOGLE_CALLBACK_URL` value as an authorized redirect URI.

### 3. Run database migrations

```bash
npm run prisma:generate    # Generate the Prisma client
npm run prisma:migrate:dev # Apply migrations and create the schema
```

### 4. Start the development server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`.

---

## Running the project

### Development

```bash
npm run start:dev      # Start with hot reload
npm run start:debug    # Start in debug mode
```

### Production

```bash
npm run build                    # Compile TypeScript → dist/
npm run prisma:migrate:prod      # Apply pending migrations
npm run start:prod               # Start from dist/main.js
```

### Prisma utilities

```bash
npm run prisma:generate      # Regenerate the Prisma client after schema changes
npm run prisma:migrate:dev   # Create and apply a new migration (development)
npm run prisma:migrate:prod  # Apply pending migrations (production)
npm run prisma:studio        # Open the visual database explorer
```

### Code quality

```bash
npm run lint     # Run ESLint with auto-fix
npm run format   # Run Prettier over src/**/*.ts
```

---

## Exploring the API

All endpoints live under `/api/v1/auth/` and are fully documented via Swagger.

With the server running, open **`http://localhost:3000/api/docs`** to browse and test every endpoint interactively.

**Tips:**
- Call `POST /auth/register` to create an account, then `POST /auth/verify-email` with the OTP sent to your inbox.
- Call `POST /auth/login` to get an access token, then click **Authorize** in Swagger and paste it.
- `POST /auth/refresh` reads the refresh token from an httpOnly cookie set at login, not from the body or the Authorization header.
- `POST /auth/forgot-password` always returns 200 regardless of whether the email exists (anti-enumeration).
- Swagger is disabled when `NODE_ENV=production`.

For the full authentication flow (tokens, cookies, session rotation, security rationale), see **[AUTHENTICATION.md](./AUTHENTICATION.md)**.

---

## Contributing

1. **Branch** off `main` with a descriptive name (`feat/...`, `fix/...`, `refactor/...`).
2. **Follow the existing code style**: run `npm run lint && npm run format` before committing.
3. **Keep commits focused**: one logical change per commit, with a clear message.
4. **Respect the architecture**: controllers stay thin, business logic belongs in use cases, database access goes through repositories. See `CLAUDE.md` for a full architecture reference.
5. **Document new endpoints**: every new endpoint needs `@ApiOperation` and `@ApiResponse` decorators.
6. **Open a pull request** against `main` with a description of what changed and why.
