import { Injectable } from '@nestjs/common';
import { Category, CategoryType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CategoryEntity } from '../entities/category.entity';

export interface CreateCategoryData {
  userId: string;
  type: CategoryType;
  name: string;
  icon: string;
  color: string;
}

export interface UpdateCategoryData {
  type?: CategoryType;
  name?: string;
  icon?: string;
  color?: string;
}

export interface ListCategoriesFilter {
  type?: CategoryType;
  isArchived?: boolean;
}

/**
 * CategoriesRepository encapsulates all database operations for the
 * categories table. The only layer that touches Prisma for this domain.
 */
@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(category: Category): CategoryEntity {
    return new CategoryEntity({
      id: category.id,
      userId: category.userId,
      type: category.type,
      name: category.name,
      icon: category.icon,
      color: category.color,
      isArchived: category.isArchived,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }

  async findAllByUserId(
    userId: string,
    filter: ListCategoriesFilter = {},
  ): Promise<CategoryEntity[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        userId,
        type: filter.type,
        isArchived: filter.isArchived,
      },
      orderBy: { createdAt: 'asc' },
    });
    return categories.map((category) => this.toEntity(category));
  }

  async findById(id: string, userId: string): Promise<CategoryEntity | null> {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    return category ? this.toEntity(category) : null;
  }

  async existsByName(
    userId: string,
    type: CategoryType,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: {
        userId,
        type,
        name,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });
    return count > 0;
  }

  async create(data: CreateCategoryData): Promise<CategoryEntity> {
    const category = await this.prisma.category.create({ data });
    return this.toEntity(category);
  }

  async createMany(
    userId: string,
    items: { type: CategoryType; name: string; icon: string; color: string }[],
  ): Promise<void> {
    await this.prisma.category.createMany({
      data: items.map((item) => ({ ...item, userId })),
    });
  }

  async update(id: string, data: UpdateCategoryData): Promise<CategoryEntity> {
    const category = await this.prisma.category.update({
      where: { id },
      data,
    });
    return this.toEntity(category);
  }

  async setArchived(id: string, isArchived: boolean): Promise<CategoryEntity> {
    const category = await this.prisma.category.update({
      where: { id },
      data: { isArchived },
    });
    return this.toEntity(category);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } });
  }
}
