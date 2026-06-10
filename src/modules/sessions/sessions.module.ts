import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsRepository } from './repositories/sessions.repository';

@Module({
  providers: [SessionsService, SessionsRepository],
  exports: [SessionsService],
})
export class SessionsModule {}
