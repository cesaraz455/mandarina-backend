import { Injectable } from '@nestjs/common';
import { UserEntity, PublicUserProfile } from './entities/user.entity';
import {
  UsersRepository,
  CreateUserData,
  UpdateUserData,
} from './repositories/users.repository';
import { UserNotFoundException } from '../../common/exceptions/auth.exceptions';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new UserNotFoundException();
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findByEmail(email);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.usersRepository.existsByEmail(email);
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    return this.usersRepository.create(data);
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity> {
    return this.usersRepository.update(id, data);
  }

  async getProfile(id: string): Promise<PublicUserProfile> {
    const user = await this.findById(id);
    return user.toPublicProfile();
  }
}
