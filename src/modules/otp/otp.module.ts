import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OtpRepository } from './repositories/otp.repository';

@Module({
  providers: [OtpService, OtpRepository],
  exports: [OtpService],
})
export class OtpModule {}
