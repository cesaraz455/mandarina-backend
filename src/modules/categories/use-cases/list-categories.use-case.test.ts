import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CategoryType } from '@prisma/client';
import { ListCategoriesUseCase } from './list-categories.use-case';
import { CategoriesRepository } from '../repositories/categories.repository';
import { CategoryEntity } from '../entities/category.entity';

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
    isArchived: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

describe('ListCategoriesUseCase', () => {
  let categoriesRepository: {
    findAllByUserId: jest.Mock<CategoriesRepository['findAllByUserId']>;
  };
  let useCase: ListCategoriesUseCase;

  beforeEach(() => {
    categoriesRepository = {
      findAllByUserId: jest.fn<CategoriesRepository['findAllByUserId']>(),
    };
    useCase = new ListCategoriesUseCase(
      categoriesRepository as unknown as CategoriesRepository,
    );
  });

  it('forwards the user id and filter to the repository', async () => {
    const categories = [buildCategory()];
    categoriesRepository.findAllByUserId.mockResolvedValue(categories);

    const result = await useCase.execute('u1', { type: CategoryType.EXPENSE });

    expect(categoriesRepository.findAllByUserId).toHaveBeenCalledWith('u1', {
      type: CategoryType.EXPENSE,
    });
    expect(result).toEqual(categories);
  });
});
