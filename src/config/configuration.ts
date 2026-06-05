export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  appName: process.env.APP_NAME ?? 'Mandarina Auth',

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },

  otp: {
    expiresInMinutes: parseInt(process.env.OTP_EXPIRES_IN_MINUTES ?? '10', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '3', 10),
  },

  session: {
    expiresInDays: parseInt(process.env.SESSION_EXPIRES_IN_DAYS ?? '30', 10),
  },

  email: {
    from: process.env.EMAIL_FROM ?? 'noreply@mandarina.app',
    resendApiKey: process.env.RESEND_API_KEY,
  },

  throttler: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '10', 10),
    authLimit: parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '5', 10),
  },
});
