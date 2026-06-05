import { createHash, randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';

const PASSWORD_SALT_ROUNDS = 12;
const OTP_SALT_ROUNDS = 10;

export class CryptoUtil {
  /**
   * Hashes a plain-text password using bcrypt.
   * Uses 12 salt rounds for strong protection against brute-force.
   */
  static hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  }

  /**
   * Compares a plain-text password against a bcrypt hash.
   */
  static comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Hashes a token (JWT string or opaque token) using SHA-256.
   * SHA-256 is appropriate for random, high-entropy tokens.
   */
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Hashes an OTP using bcrypt.
   * OTPs are short (6 digits), so bcrypt prevents trivial lookup.
   */
  static hashOtp(otp: string): Promise<string> {
    return bcrypt.hash(otp, OTP_SALT_ROUNDS);
  }

  /**
   * Compares a plain-text OTP against a bcrypt hash.
   */
  static compareOtp(otp: string, hash: string): Promise<boolean> {
    return bcrypt.compare(otp, hash);
  }

  /**
   * Generates a cryptographically secure 6-digit OTP.
   */
  static generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }
}
