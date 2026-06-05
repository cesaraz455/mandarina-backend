import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ResendProvider } from './providers/resend.provider';

@Module({
  providers: [ResendProvider, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
