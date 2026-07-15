import { readFileSync } from 'fs';
import { join } from 'path';
import {
  Inject,
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { RESEND_CLIENT } from './providers/resend.provider';
import { SendEmailOptions } from './interfaces/email-options.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;
  private readonly otpExpiresInMinutes: number;
  private readonly verificationTemplate: string;
  private readonly passwordResetTemplate: string;

  constructor(
    @Inject(RESEND_CLIENT) private readonly resend: Resend,
    private readonly configService: ConfigService,
  ) {
    this.from = this.configService.getOrThrow<string>('email.from');
    this.otpExpiresInMinutes = this.configService.getOrThrow<number>(
      'otp.expiresInMinutes',
    );
    this.verificationTemplate = readFileSync(
      join(__dirname, 'templates', 'email-verification.html'),
      'utf8',
    );
    this.passwordResetTemplate = readFileSync(
      join(__dirname, 'templates', 'password-reset.html'),
      'utf8',
    );
  }

  /**
   * Core send method: all outgoing emails funnel through here.
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
      subject: 'Verifica tu cuenta de Mandarina',
      text: `Tu codigo de verificacion es: ${otp}\n\nEste codigo expira en ${this.otpExpiresInMinutes} minutos.\n\nSi no creaste una cuenta en Mandarina, puedes ignorar este correo.`,
      html: this.verificationTemplate
        .replace('{{OTP}}', otp)
        .replace('{{EXPIRES_IN}}', String(this.otpExpiresInMinutes)),
    });
  }

  async sendPasswordReset(to: string, otp: string): Promise<void> {
    await this.send({
      to,
      subject: 'Recupera tu contraseña de Mandarina',
      text: `Tu codigo de recuperacion es: ${otp}\n\nEste codigo expira en ${this.otpExpiresInMinutes} minutos.\n\nSi no solicitaste recuperar tu contraseña, asegura tu cuenta de inmediato.`,
      html: this.passwordResetTemplate
        .replace('{{OTP}}', otp)
        .replace('{{EXPIRES_IN}}', String(this.otpExpiresInMinutes)),
    });
  }
}
