import { Injectable } from '@nestjs/common';
import { UserAuthAccount } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserAuthAccountEntity } from '../entities/user-auth-account.entity';

export interface CreateUserAuthAccountData {
  userId: string;
  provider: string;
  providerUserId: string;
}

/**
 * UserAuthAccountsRepository encapsulates all database operations for the
 * user_auth_accounts table.
 *
 * Architecture decision: Repositories live in the infrastructure layer.
 * They translate between domain entities and Prisma models, keeping
 * business logic free of ORM concerns.
 */
@Injectable()
export class UserAuthAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(account: UserAuthAccount): UserAuthAccountEntity {
    return new UserAuthAccountEntity({
      id: account.id,
      userId: account.userId,
      provider: account.provider,
      providerUserId: account.providerUserId,
      createdAt: account.createdAt,
    });
  }

  async findByProvider(
    provider: string,
    providerUserId: string,
  ): Promise<UserAuthAccountEntity | null> {
    const account = await this.prisma.userAuthAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
    });
    return account ? this.toEntity(account) : null;
  }

  async create(
    data: CreateUserAuthAccountData,
  ): Promise<UserAuthAccountEntity> {
    const account = await this.prisma.userAuthAccount.create({
      data: {
        userId: data.userId,
        provider: data.provider,
        providerUserId: data.providerUserId,
      },
    });
    return this.toEntity(account);
  }
}
