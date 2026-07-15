import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().default('Mandarina Auth'),

  DATABASE_URL: Joi.string().uri().required(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  OTP_EXPIRES_IN_MINUTES: Joi.number().default(10),
  OTP_MAX_ATTEMPTS: Joi.number().default(3),
  OTP_RESEND_COOLDOWN_SECONDS: Joi.number().default(60),

  SESSION_EXPIRES_IN_DAYS: Joi.number().default(30),

  EMAIL_FROM: Joi.string().email().required(),
  RESEND_API_KEY: Joi.string().pattern(/^re_/).required().messages({
    'string.pattern.base': 'RESEND_API_KEY must start with "re_"',
  }),

  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(10),
  THROTTLE_AUTH_LIMIT: Joi.number().default(5),
});
