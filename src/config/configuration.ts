// Joi (env.validation.ts) is the single source of truth for defaults and required vars;
// it runs before this factory and backfills process.env, so every read below is guaranteed
// to exist. `parseInt` requires a `string` argument, so those reads need `!` to satisfy TS
// (process.env types are always `string | undefined`); plain string passthroughs don't.
// This file only owns type coercion (string -> number), not default values.
export default () => ({
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT!),
  appName: process.env.APP_NAME,

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },

  otp: {
    expiresInMinutes: parseInt(process.env.OTP_EXPIRES_IN_MINUTES!),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS!),
    resendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS!),
  },

  session: {
    expiresInDays: parseInt(process.env.SESSION_EXPIRES_IN_DAYS!),
  },

  email: {
    from: process.env.EMAIL_FROM,
    resendApiKey: process.env.RESEND_API_KEY,
  },

  throttler: {
    ttl: parseInt(process.env.THROTTLE_TTL!),
    limit: parseInt(process.env.THROTTLE_LIMIT!),
    authLimit: parseInt(process.env.THROTTLE_AUTH_LIMIT!),
  },
});
