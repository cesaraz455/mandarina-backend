import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserEntity } from '../entities/user.entity';

export interface CreateUserData {
  email: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserData {
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
}

/**
 * UsersRepository encapsulates all database operations for the users table.
 *
 * Architecture decision: Repositories live in the infrastructure layer.
 * They translate between domain entities and Prisma models, keeping
 * business logic free of ORM concerns.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(user: User): UserEntity {
    return new UserEntity({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePictureUrl: user.profilePictureUrl,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return user ? this.toEntity(user) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });
    return this.toEntity(user);
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });
    return this.toEntity(user);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  }
}
