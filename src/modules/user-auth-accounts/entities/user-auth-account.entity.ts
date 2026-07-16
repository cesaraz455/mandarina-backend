/**
 * Domain entity for UserAuthAccount.
 *
 * Links a user to an external identity provider (e.g. Google) via the provider's
 * own user id, so a single user can authenticate through multiple providers.
 */
export class UserAuthAccountEntity {
  readonly id!: string;
  readonly userId!: string;
  readonly provider!: string;
  readonly providerUserId!: string;
  readonly createdAt!: Date;

  constructor(data: {
    id: string;
    userId: string;
    provider: string;
    providerUserId: string;
    createdAt: Date;
  }) {
    Object.assign(this, data);
  }
}
