import { Inject, Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { RESEND_CLIENT } from './providers/resend.provider';
import { SendEmailOptions } from './interfaces/email-options.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;

  constructor(
    @Inject(RESEND_CLIENT) private readonly resend: Resend,
    private readonly configService: ConfigService,
  ) {
    this.from = this.configService.getOrThrow<string>('email.from');
  }

  /**
   * Core send method — all outgoing emails funnel through here.
   * Throws InternalServerErrorException on Resend API errors so callers
   * can handle or suppress as needed.
   */
  private async send(options: SendEmailOptions): Promise<void> {
    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      ...(options.text ? { text: options.text } : {}),
    });

    if (error) {
      this.logger.error(
        `Resend API error sending to ${options.to}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to send email');
    }

    this.logger.log(`Email sent to ${options.to} [id=${data?.id}]`);
  }

  async sendEmailVerification(to: string, otp: string): Promise<void> {
    await this.send({
      to,
      subject: 'Verify your Mandarina account',
      text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not create a Mandarina account, you can safely ignore this email.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
          <h2 style="margin: 0 0 16px; font-size: 22px;">Verify your email</h2>
          <p style="margin: 0 0 24px; color: #444;">
            Use the following code to verify your Mandarina account:
          </p>
          <div style="font-size: 40px; font-weight: 700; letter-spacing: 10px;
                      text-align: center; padding: 24px 16px;
                      background: #f4f4f5; border-radius: 12px; margin-bottom: 24px;">
            ${otp}
          </div>
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
            This code expires in <strong>10 minutes</strong>.
          </p>
          <p style="margin: 0; color: #999; font-size: 12px;">
            If you did not create a Mandarina account, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  }

  async sendPasswordReset(to: string, otp: string): Promise<void> {
    await this.send({
      to,
      subject: 'Reset your Mandarina password',
      text: `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please secure your account immediately.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
          <h2 style="margin: 0 0 16px; font-size: 22px;">Reset your password</h2>
          <p style="margin: 0 0 24px; color: #444;">
            Use the following code to reset your Mandarina password:
          </p>
          <div style="font-size: 40px; font-weight: 700; letter-spacing: 10px;
                      text-align: center; padding: 24px 16px;
                      background: #f4f4f5; border-radius: 12px; margin-bottom: 24px;">
            ${otp}
          </div>
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
            This code expires in <strong>10 minutes</strong>.
          </p>
          <p style="margin: 0; color: #d00; font-size: 12px;">
            If you did not request a password reset, please secure your account immediately.
          </p>
        </div>
      `,
    });
  }
}
