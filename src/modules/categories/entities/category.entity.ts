import { CategoryType } from '@prisma/client';

/**
 * Domain entity for Category. Plain TypeScript class, decoupled from the
 * Prisma model, following the same pattern as UserEntity.
 */
export class CategoryEntity {
  readonly id!: string;
  readonly userId!: string;
  readonly type!: CategoryType;
  readonly name!: string;
  readonly icon!: string;
  readonly color!: string;
  readonly isArchived!: boolean;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;

  constructor(data: {
    id: string;
    userId: string;
    type: CategoryType;
    name: string;
    icon: string;
    color: string;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    Object.assign(this, data);
  }

  toResponse(): CategoryResponse {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      icon: this.icon,
      color: this.color,
      isArchived: this.isArchived,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface CategoryResponse {
  id: string;
  type: CategoryType;
  name: string;
  icon: string;
  color: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
