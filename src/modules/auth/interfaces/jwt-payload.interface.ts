/**
 * Payload for JWT access tokens.
 * Keep minimal — this is serialized into every request.
 */
export interface JwtAccessPayload {
  /** User ID (subject) */
  sub: string;
  /** User email */
  email: string;
  /** Session ID — used for logout */
  sid: string;
}

/**
 * Payload for JWT refresh tokens.
 */
export interface JwtRefreshPayload {
  /** User ID (subject) */
  sub: string;
  /** Session ID — used to look up and rotate the session */
  sid: string;
}
