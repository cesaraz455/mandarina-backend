import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CategoryType } from '@prisma/client';
import { DeleteCategoryUseCase } from './delete-category.use-case';
import { CategoriesRepository } from '../repositories/categories.repository';
import { CategoryEntity } from '../entities/category.entity';
import {
  CategoryNotArchivedException,
  CategoryNotFoundException,
} from '../../../common/exceptions/category.exceptions';

const buildCategory = (
  overrides: Partial<CategoryEntity> = {},
): CategoryEntity =>
  new CategoryEntity({
    id: 'c1',
    userId: 'u1',
    type: CategoryType.EXPENSE,
    name: 'Alimentación',
    icon: 'tools-kitchen-2',
    color: '#F7901F',
    isArchived: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

describe('DeleteCategoryUseCase', () => {
  let categoriesRepository: {
    findById: jest.Mock<CategoriesRepository['findById']>;
    delete: jest.Mock<CategoriesRepository['delete']>;
  };
  let useCase: DeleteCategoryUseCase;

  beforeEach(() => {
    categoriesRepository = {
      findById: jest.fn<CategoriesRepository['findById']>(),
      delete: jest.fn<CategoriesRepository['delete']>(),
    };
    useCase = new DeleteCategoryUseCase(
      categoriesRepository as unknown as CategoriesRepository,
    );
  });

  it('deletes an archived category owned by the user', async () => {
    categoriesRepository.findById.mockResolvedValue(
      buildCategory({ isArchived: true }),
    );

    await useCase.execute('c1', 'u1');

    expect(categoriesRepository.delete).toHaveBeenCalledWith('c1');
  });

  it('throws CategoryNotArchivedException when the category is still active', async () => {
    categoriesRepository.findById.mockResolvedValue(
      buildCategory({ isArchived: false }),
    );

    await expect(useCase.execute('c1', 'u1')).rejects.toThrow(
      CategoryNotArchivedException,
    );
    expect(categoriesRepository.delete).not.toHaveBeenCalled();
  });

  it('throws CategoryNotFoundException when the category does not belong to the user', async () => {
    categoriesRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('c1', 'u1')).rejects.toThrow(
      CategoryNotFoundException,
    );
    expect(categoriesRepository.delete).not.toHaveBeenCalled();
  });
});
