import { Module } from '@nestjs/common';
import { UserAuthAccountsService } from './user-auth-accounts.service';
import { UserAuthAccountsRepository } from './repositories/user-auth-accounts.repository';

@Module({
  providers: [UserAuthAccountsService, UserAuthAccountsRepository],
  exports: [UserAuthAccountsService],
})
export class UserAuthAccountsModule {}
