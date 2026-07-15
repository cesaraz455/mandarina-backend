# Authentication Flow

This document explains how authentication works end to end in the Mandarina Auth Backend: what each token is, where it lives, how it moves between client and server, and the security decisions behind that design. For the exact request/response shape of every endpoint (bodies, status codes, examples), use Swagger at `http://localhost:3000/api/docs` — this document explains the *why* and the *flow*, Swagger is the source of truth for the *contract*.

---

## The two tokens

| | Access token | Refresh token |
|---|---|---|
| Purpose | Authorizes API calls | Obtains a new access token |
| Lifetime | 15 minutes (`JWT_ACCESS_EXPIRES_IN`) | 30 days (`JWT_REFRESH_EXPIRES_IN`), rotated on every use |
| Where it travels | `Authorization: Bearer <token>` header, in the response body | httpOnly cookie only, never in a JSON body |
| Where it's stored server-side | Nowhere (stateless, verified by signature) | SHA-256 hash on the `Session` row; the raw token never touches the database |
| Payload | `{ sub: userId, email, sid: sessionId }` | `{ sub: userId, sid: sessionId }` |

Both tokens embed the same `sid` (session ID), which is how a session ties an access token to the refresh token that spawned it, and how logout knows which session to revoke.

## Why the refresh token is a cookie, not a body field

The web client (`pwa/`) is a browser SPA, which means any token placed in `localStorage` or a JS-readable cookie is reachable by an XSS payload. The refresh token is long-lived (30 days) and directly mintable into new access tokens, so it is the highest-value target in the system. It is therefore set as an **httpOnly cookie** (`refresh_token`, see `src/modules/auth/refresh-cookie.util.ts`):

- `httpOnly: true` — invisible to JavaScript, immune to XSS token theft.
- `sameSite: 'strict'` — never sent on cross-site requests; this is the CSRF defense, so no separate CSRF token is needed.
- `path: '/api/v1/auth'` — the browser only attaches it to auth endpoints, not the rest of the API.
- `secure: true` in production (HTTPS only), `false` in development so it works over plain HTTP on `localhost`.
- `maxAge` is only set when the client passes `rememberMe: true` on login; otherwise it's a session cookie cleared when the browser closes.

The access token, by contrast, is short-lived and low blast-radius if leaked, so it is returned in the response body and held in memory by the client (never persisted), then sent as a normal `Authorization: Bearer` header.

There is **no mobile/token-in-body flow** anymore — that was removed when the client migrated from the Expo app to the Vue 3 PWA. If a future native client needs auth, it will need its own strategy (cookies don't work the same way outside a browser); don't assume the current shape generalizes to non-browser clients.

## Flows

### Register → verify email

1. `POST /auth/register` creates the user (`isEmailVerified: false`) and a 6-digit OTP (bcrypt-hashed, `OtpType.EMAIL_VERIFICATION`), emailed via Resend.
2. Email delivery is **best-effort**: if Resend fails, the account is still created and the error is logged, not thrown. The client should offer "resend code" (`POST /auth/resend-verification`) as the recovery path.
3. `POST /auth/verify-email` checks the OTP (bcrypt compare, max 3 attempts, `OTP_EXPIRES_IN_MINUTES`) and flips `isEmailVerified: true`.

### Login

`POST /auth/login` (see `login.use-case.ts`):

1. Look up the user by email. Wrong email and wrong password return the **same** `InvalidCredentialsException` (401) — this prevents an attacker from telling which one was wrong (user enumeration).
2. If the account is deactivated → 403 `AccountNotActiveException`.
3. If the email isn't verified yet, the use case **auto-issues a fresh OTP and emails it**, then throws 403 with `code: "EMAIL_NOT_VERIFIED"`. The client is expected to catch that code and route straight to the OTP-entry screen — the user doesn't have to separately call resend-verification.
4. On success: a `sessionId` (UUID) is generated up front and embedded in both tokens, a `Session` row is persisted with the IP/user-agent and the refresh token's hash, and the controller sets the refresh cookie before returning `{ accessToken, user }`.

### Using the API

Every non-`@Public()` route requires `Authorization: Bearer <accessToken>`. The `@Public()` decorator is an explicit **opt-out** — everything is protected by default (see `CLAUDE.md`).

### Refreshing

`POST /auth/refresh` (see `refresh-token.use-case.ts`) is guarded by `AuthGuard('jwt-refresh')`, whose strategy reads the raw token **only from the httpOnly cookie** (`refreshTokenCookieExtractor` in `jwt-refresh.strategy.ts`) — not from the body, not from a header. Nothing except the browser (via the cookie) can present this token.

On a valid refresh:
1. The session is looked up by `sid`. If it's already revoked or the stored token hash doesn't match the presented token, this is treated as **possible token reuse** (e.g. a stolen refresh token used after the legitimate client already rotated it) and **every session for that user is revoked**, forcing a full re-login everywhere.
2. Otherwise the old session is revoked and a brand-new session/tokens pair is minted (rotation) — a refresh token is single-use.
3. The controller writes the new refresh token back into the same cookie; only the new access token goes in the response body.

### Logout

`POST /auth/logout` revokes the session identified by the access token's `sid` and clears the refresh cookie. It does not require the refresh token at all — only a valid access token.

### Forgot / reset password

1. `POST /auth/forgot-password` **always returns 200**, whether or not the email exists — this is the other anti-enumeration measure in the system. If the account exists, an OTP (`OtpType.PASSWORD_RESET`) is emailed.
2. `POST /auth/verify-reset-otp` lets the client validate the code *before* asking for a new password, without consuming it — this is what lets a multi-step reset UI show "code accepted" before the final step.
3. `POST /auth/reset-password` consumes the OTP, hashes and saves the new password, and **revokes every active session for the user** — a password reset forces re-login on all devices, including the one that just performed the reset.

---

## Sequence: login → protected call → refresh → logout

```
Browser                          API                              DB
  |--- POST /auth/login --------->|                                 |
  |                                |-- verify password, create session
  |                                |-- sign access+refresh JWTs ----->|
  |<--- 200 {accessToken, user} ---|  (+ Set-Cookie: refresh_token)  |
  |                                                                   |
  |--- GET /auth/me --------------->|                                 |
  |    Authorization: Bearer <access>                                |
  |<--- 200 {profile} -------------|                                 |
  |                                                                   |
  |  ... 15 minutes later, access token expired ...                  |
  |--- POST /auth/refresh --------->|  (cookie sent automatically)   |
  |                                |-- validate + rotate session ---->|
  |<--- 200 {accessToken} ---------|  (+ Set-Cookie: new refresh)    |
  |                                                                   |
  |--- POST /auth/logout ---------->|                                 |
  |    Authorization: Bearer <access>                                |
  |                                |-- revoke session -------------->|
  |<--- 200 -----------------------|  (+ clear-cookie)               |
```

---

## Security mechanisms summary

| Mechanism | Where |
|---|---|
| No user enumeration on login | Identical error for unknown email vs. wrong password (`login.use-case.ts`) |
| No user enumeration on password recovery | `forgot-password` always returns 200 (`forgot-password.use-case.ts`) |
| Refresh token reuse detection | Hash mismatch or already-revoked session → revoke all sessions for the user (`refresh-token.use-case.ts`) |
| Session invalidation on password reset | All sessions revoked on successful reset (`reset-password.use-case.ts`) |
| XSS-resistant refresh token | httpOnly cookie, never exposed to JS |
| CSRF defense | `sameSite: strict` on the refresh cookie, no separate CSRF token needed |
| Password/OTP storage | bcrypt (12 rounds for passwords, 10 for OTPs); refresh tokens stored as SHA-256 hashes |
| Rate limiting | Per-endpoint `@Throttle()`, tightest on `login`/`register`/`forgot-password`/`resend-verification` |

## Related documentation

- `CLAUDE.md` — architecture, layering, conventions, and the "AI agent" guidance for this backend.
- Swagger UI (`/api/docs`, non-production only) — authoritative request/response schemas for every endpoint.
- `prisma/schema.prisma` — the `User`, `Session`, and `Otp` models referenced throughout this document.
