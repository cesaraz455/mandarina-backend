import { Injectable } from '@nestjs/common';
import { UserAuthAccountEntity } from './entities/user-auth-account.entity';
import {
  UserAuthAccountsRepository,
  CreateUserAuthAccountData,
} from './repositories/user-auth-accounts.repository';

@Injectable()
export class UserAuthAccountsService {
  constructor(
    private readonly userAuthAccountsRepository: UserAuthAccountsRepository,
  ) {}

  async findByProvider(
    provider: string,
    providerUserId: string,
  ): Promise<UserAuthAccountEntity | null> {
    return this.userAuthAccountsRepository.findByProvider(
      provider,
      providerUserId,
    );
  }

  async link(data: CreateUserAuthAccountData): Promise<UserAuthAccountEntity> {
    return this.userAuthAccountsRepository.create(data);
  }
}
