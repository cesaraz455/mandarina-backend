import { CookieOptions } from 'express';

/** Name of the httpOnly cookie that carries the refresh token for the web (PWA) client. */
export const REFRESH_COOKIE_NAME = 'refresh_token';

/**
 * The refresh cookie is scoped to the auth path so the browser only attaches it to
 * /auth/* endpoints (refresh, logout), never to the rest of the API. SameSite=Strict
 * is the CSRF defense: the cookie is never sent on cross-site requests, and the PWA is
 * served same-origin in dev (Vite proxy) and same-site in production.
 */
const REFRESH_COOKIE_PATH = '/api/v1/auth';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Options for setting the refresh cookie. When rememberMe is false it becomes a session
 * cookie (no maxAge) so it is cleared when the browser closes.
 */
export function refreshCookieOptions(
  isProduction: boolean,
  sessionExpiresInDays: number,
  rememberMe: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: rememberMe ? sessionExpiresInDays * MS_PER_DAY : undefined,
  };
}

/** Options for clearing the refresh cookie on logout. Must match path and attributes. */
export function clearRefreshCookieOptions(
  isProduction: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
  };
}
