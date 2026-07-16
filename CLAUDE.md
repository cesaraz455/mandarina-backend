# CLAUDE.md: Mandarina Auth Backend

This file provides context and guidance to Claude Code when working with this repository.

---

## Project description

**Mandarina Auth Backend** is the authentication service for **Mandarina**, a personal finance application. It exposes a REST API built with NestJS that manages the full user identity lifecycle:

- User registration with email verification via OTP
- Login with short-lived JWT access tokens + rotating refresh tokens
- Sign-In with Google (OAuth 2.0 server-side redirect flow)
- Logout and session revocation
- Password recovery via OTP
- Email verification resend
- Authenticated user profile retrieval

**Base URL:** `http://localhost:3000/api/v1`  
**Swagger (non-production only):** `http://localhost:3000/api/docs`

---

## Authentication flow (read this before touching `modules/auth`)

Full narrative version with sequence diagrams and rationale: **[AUTHENTICATION.md](./AUTHENTICATION.md)**. The summary an AI agent needs to hold in mind while editing this module:

- **Two tokens, two transports.** The access JWT (15 min, `jwt.accessSecret`) is returned in the response body and sent back as `Authorization: Bearer <token>`. The refresh JWT (30 days, `jwt.refreshSecret`, rotated every use) is **never** in a JSON body — it only exists as the `refresh_token` httpOnly cookie (`src/modules/auth/refresh-cookie.util.ts`), scoped to `path: /api/v1/auth`. There is no mobile/token-in-body flow: the client is a browser-only Vue 3 PWA. Do not reintroduce `refreshToken` into any response DTO.
- **`sid` (session ID) is the join key.** Both tokens embed the same `sid`, generated up front in `login.use-case.ts` / `refresh-token.use-case.ts` and persisted on the `Session` row alongside the refresh token's SHA-256 hash. Logout and refresh both resolve "which session" via `sid`, never via the raw token value.
- **`JwtRefreshStrategy` reads the cookie, not the body.** See `refreshTokenCookieExtractor` in `jwt-refresh.strategy.ts`. If you're wiring a new endpoint that needs the refresh token, extend that strategy's guard — don't add a `refreshToken` field to a DTO.
- **Refresh token reuse is treated as a breach signal.** If a presented refresh token's hash doesn't match the session's stored hash, or the session is already revoked, `refresh-token.use-case.ts` revokes **every session for that user**, not just the one in question.
- **Two anti-enumeration points**: `login.use-case.ts` throws the identical `InvalidCredentialsException` for "no such user" and "wrong password"; `forgot-password.use-case.ts` always returns 200. Do not add branches that would let a response distinguish these cases (timing, status code, or message).
- **An unverified email at login auto-resends the OTP.** `login.use-case.ts` doesn't just reject with 403 — it issues and emails a fresh verification OTP first, then throws with `code: EMAIL_NOT_VERIFIED`. Keep that side effect in mind if you touch this path; it's intentional, not a leftover from `resend-verification`.
- **A password reset invalidates every session.** `reset-password.use-case.ts` revokes all sessions for the user on success, by design (see `AUTHENTICATION.md`).
- **Google Sign-In reuses the same session machinery, it does not replace it.** `GoogleStrategy` (`google.strategy.ts`, via the `passport-google-oauth20` dependency) and `GoogleOAuthGuard` handle the OAuth redirect; `google-login/google-login.use-case.ts` finds-or-creates-links the user through `UserAuthAccountsService` (the `user_auth_accounts` table) and then mints the same sid/access/refresh token trio as `login.use-case.ts`. The callback endpoint never returns JSON: on success or failure it always redirects to `${FRONTEND_URL}/auth/google/callback` with a `?status=` or `?error=` query param, never a thrown HTTP error.
- **`src/config/env.validation.ts` (Joi) is the single source of truth for env var defaults.** `configuration.ts` never repeats a default value; see the "Environment variables" section below.

---

## Architecture

The project follows a **layered architecture** with explicit separation of concerns:

```
Controller → Service (facade) → Use Case → Repository → Prisma (ORM)
                                                ↕
                                         Domain Entity
```

### Layer responsibilities

| Layer | Responsibility |
|---|---|
| **Controller** | Receive HTTP requests, validate DTOs, delegate to the service |
| **Service** | Pure facade: forwards calls to the appropriate use case |
| **Use Case** | All business logic for a single atomic operation (`execute(...)`) |
| **Repository** | Abstraction over Prisma: the only layer that touches the database |
| **Domain Entity** | Plain TypeScript class, no ORM dependencies |

### Key design decisions

1. **Domain entities decoupled from ORM**: Prisma models are not exposed outside repositories; they are mapped to domain classes (`UserEntity`, `SessionEntity`, `OtpEntity`).
2. **`@Public()` as opt-out from the global guard**: all routes require a JWT by default; a route is explicitly declared public with the decorator.
3. **Service as facade**: controllers talk only to the service, never to use cases directly. Keeps controllers thin and makes it easy to reorder logic.
4. **Typed domain exceptions**: all business exceptions live in `src/common/exceptions/auth.exceptions.ts`.
5. **Best-effort email on registration**: if sending the OTP fails, it is logged but the registration is not rolled back.
6. **Anti-enumeration on forgot-password**: always returns 200 regardless of whether the email exists.

---

## Database

The full schema is defined in `prisma/schema.prisma`. Refer to that file as the single source of truth for models, fields, indexes, and relations.

Key security notes about the schema:
- Passwords are stored as bcrypt hashes: never the raw value.
- Refresh tokens are stored as SHA-256 hashes: the raw token only travels in the HTTP response.
- `UserAuthAccount` links a user to an external identity provider account via a compound unique `(provider, providerUserId)` key. Google Sign-In (`src/modules/user-auth-accounts/`) is the first provider wired up; a future provider (GitHub, etc.) would follow the same `provider` string + `providerUserId` pattern.

---

## Environment variables

The `.env.example` file documents all supported variables with example values. The following shows the expected shape and defaults:

```env
NODE_ENV=development
PORT=3000
APP_NAME=Mandarina Auth

DATABASE_URL=postgresql://user:password@localhost:5432/mandarina_db

JWT_ACCESS_SECRET=<at least 32 characters>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<at least 32 characters>
JWT_REFRESH_EXPIRES_IN=30d

OTP_EXPIRES_IN_MINUTES=10
OTP_MAX_ATTEMPTS=3
SESSION_EXPIRES_IN_DAYS=30

EMAIL_FROM=noreply@mandarina.app
RESEND_API_KEY=re_xxxxxxxxxxxx

THROTTLE_TTL=60
THROTTLE_LIMIT=10
THROTTLE_AUTH_LIMIT=5

GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

**`src/config/env.validation.ts` (Joi schema) is the single source of truth for defaults and required vars.** It validates `process.env` at startup and, for any variable that has a `.default(...)`, backfills `process.env` with that default before anything else reads it. `src/config/configuration.ts` never repeats a default: it only reads `process.env` and coerces types (e.g. `parseInt` for numbers). If you need to change a default, change it in `env.validation.ts` only.

**Joi validation rules applied at startup:**
- `DATABASE_URL`: valid URI, required
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: minimum 32 characters, required
- `RESEND_API_KEY`: must start with `re_`, required
- `EMAIL_FROM`: valid email format, required
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: required, no default (the Google Cloud OAuth client must already exist; see `README.md`)
- Everything else (`PORT`, `APP_NAME`, `JWT_*_EXPIRES_IN`, `OTP_*`, `SESSION_EXPIRES_IN_DAYS`, `THROTTLE_*`, `GOOGLE_CALLBACK_URL`, `FRONTEND_URL`) has a `.default(...)` in the schema and is optional.

The app will refuse to start if any required variable is missing or invalid.

---

## Common commands

```bash
npm run start:dev            # Start development server with hot reload
npm run build                # Compile TypeScript → dist/
npm run lint                 # ESLint with auto-fix
npm run format               # Prettier over src/**/*.ts
npm run prisma:generate      # Regenerate Prisma client after schema changes
npm run prisma:migrate:dev   # Create and apply a migration (development)
npm run prisma:migrate:prod  # Apply pending migrations (production)
npm run prisma:studio        # Open the visual DB explorer
```

See `README.md` for full setup and installation instructions.

---

## Code conventions

### Naming

- **Files**: `kebab-case` → `register.use-case.ts`, `jwt-auth.guard.ts`
- **Classes**: `PascalCase` → `RegisterUseCase`, `UserEntity`
- **Interfaces**: `PascalCase` without `I` prefix unless it conflicts with a class of the same name → `JwtAccessPayload`
- **Variables and parameters**: `camelCase`
- **Prisma tables**: `snake_case` via `@@map("table_name")`
- **Prisma columns**: `camelCase` in the model, `snake_case` in the DB via `@map`

### Use case structure

Each atomic operation lives in its own `<name>.use-case.ts` file with a single public method `execute(...)`. Use cases are registered as providers in the corresponding feature module (e.g., `auth.module.ts` is a current example: other modules may follow the same pattern as the project grows) and injected into the service.

### DTOs

- Decorated with `class-validator` (`@IsEmail()`, `@IsString()`, `@MinLength()`, etc.)
- The global `ValidationPipe` runs with `whitelist: true` + `forbidNonWhitelisted: true`: undeclared properties are automatically rejected.

### Exceptions

Always use the typed exceptions from `src/common/exceptions/auth.exceptions.ts`. Do not throw `new HttpException(...)` or `new BadRequestException('string literal')` directly from use cases.

### Comments

Only comment when the **why** is non-obvious: a hidden constraint, a subtle invariant, a workaround, an architectural decision. Do not comment what the code does. Avoid emojis, special characters, and the em dash (—) in comments and documentation.

---

## Security standards

| Concern | Implementation |
|---|---|
| Passwords | bcrypt, 12 salt rounds |
| OTPs | bcrypt, 10 salt rounds (prevents lookup tables on 6-digit codes) |
| Refresh tokens | UUID v4 raw: stored as SHA-256 hash in DB; raw token only in the HTTP response |
| Access tokens | Signed JWT, expires in 15 min |
| Refresh tokens | Signed JWT, expires in 30 days; rotated on every use |
| Rate limiting | Global 10/min; login/register 5/min; forgot-password/resend 3/min |
| Anti-enumeration | `forgotPassword` always returns 200 even when the email does not exist |
| CORS | Open in development; `origin: false` in production |
| Validation | Global `ValidationPipe`: strips and rejects undeclared DTO properties |

---

## Quality standards

- **Unit tests only (Jest)**: unit tests with mocked dependencies (see the auth cookie specs, e.g. `auth.controller.spec.ts`). Do not add E2E or integration/repository test suites.
- **No dead code**: do not leave `_unused` variables, unused imports, or commented-out blocks.
- **No premature abstractions**: add an abstraction only when there are three or more real usages.
- **No unnecessary error handling**: do not catch exceptions that cannot occur. Trust framework guarantees.
- **Swagger required on new endpoints**: every endpoint must have `@ApiOperation`, `@ApiResponse` for relevant status codes, and `@ApiBearerAuth` when JWT is required.

---

## Rules for AI

- **Read a similar existing file before creating a new one** to maintain structural consistency (e.g., read an existing use case before writing a new one, or an existing repository before adding another).
- **Respect the layer separation**: do not access the database directly from use cases; always go through the corresponding repository.
- **Do not modify the root module** except to register new feature modules. The global guards, pipes, and filters are intentionally configured there.
- **Do not add dependencies** without explicit justification: the project keeps its dependency footprint minimal.
- **When adding a new flow**, follow the established pattern: DTO → use case → method on the service → endpoint on the controller with throttle and Swagger decorators.
- **Do not flatten the service facade**: the pattern is intentional to keep controllers thin.
- **Do not expose password hashes or token hashes** outside their respective contexts (repository layer / login logic).

---

## Important constraints

- **`NODE_ENV=production`** automatically disables Swagger and closes CORS. Do not add additional environment-based conditional logic outside `main.ts`.
- **Prisma migrations**: never edit files inside `prisma/migrations/` manually. Use `prisma migrate dev` to create and `prisma migrate deploy` to apply.
- **JWT secrets must be at least 32 characters**: Joi validation will block startup otherwise.
- **`RESEND_API_KEY` must start with `re_`**: Joi validation will block startup otherwise.
- **Never store the raw refresh token in the DB**: only its SHA-256 hash. The raw token exists only in memory during the request.
- **Do not change bcrypt salt rounds** without explicit review: it directly affects both performance and security.
