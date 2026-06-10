/**
 * Domain entity for User.
 *
 * Architecture decision: We use a plain TypeScript class (not Prisma model directly)
 * to decouple the domain layer from the ORM. This allows us to add domain logic,
 * enforce invariants, and swap ORMs without touching business logic.
 */
export class UserEntity {
  readonly id!: string;
  readonly email!: string;
  readonly passwordHash!: string | null;
  readonly firstName!: string | null;
  readonly lastName!: string | null;
  readonly profilePictureUrl!: string | null;
  readonly isEmailVerified!: boolean;
  readonly isActive!: boolean;
  readonly lastLoginAt!: Date | null;
  readonly emailVerifiedAt!: Date | null;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;

  constructor(data: {
    id: string;
    email: string;
    passwordHash: string | null;
    firstName: string | null;
    lastName: string | null;
    profilePictureUrl: string | null;
    isEmailVerified: boolean;
    isActive: boolean;
    lastLoginAt: Date | null;
    emailVerifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    Object.assign(this, data);
  }

  get fullName(): string {
    const parts = [this.firstName, this.lastName].filter(Boolean);
    return parts.join(' ');
  }

  /**
   * Returns a safe public representation (no sensitive fields).
   */
  toPublicProfile(): PublicUserProfile {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      profilePictureUrl: this.profilePictureUrl,
      isEmailVerified: this.isEmailVerified,
      isActive: this.isActive,
      createdAt: this.createdAt,
    };
  }
}

export interface PublicUserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
}
