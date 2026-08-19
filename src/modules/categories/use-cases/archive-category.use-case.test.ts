import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CategoryType } from '@prisma/client';
import { ArchiveCategoryUseCase } from './archive-category.use-case';
import { CategoriesRepository } from '../repositories/categories.repository';
import { CategoryEntity } from '../entities/category.entity';
import { CategoryNotFoundException } from '../../../common/exceptions/category.exceptions';

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

describe('ArchiveCategoryUseCase', () => {
  let categoriesRepository: {
    findById: jest.Mock<CategoriesRepository['findById']>;
    setArchived: jest.Mock<CategoriesRepository['setArchived']>;
  };
  let useCase: ArchiveCategoryUseCase;

  beforeEach(() => {
    categoriesRepository = {
      findById: jest.fn<CategoriesRepository['findById']>(),
      setArchived: jest.fn<CategoriesRepository['setArchived']>(),
    };
    useCase = new ArchiveCategoryUseCase(
      categoriesRepository as unknown as CategoriesRepository,
    );
  });

  it('archives a category owned by the user', async () => {
    categoriesRepository.findById.mockResolvedValue(buildCategory());
    const archived = buildCategory({ isArchived: true });
    categoriesRepository.setArchived.mockResolvedValue(archived);

    const result = await useCase.execute('c1', 'u1');

    expect(categoriesRepository.setArchived).toHaveBeenCalledWith('c1', true);
    expect(result).toEqual(archived);
  });

  it('throws CategoryNotFoundException when the category does not belong to the user', async () => {
    categoriesRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('c1', 'u1')).rejects.toThrow(
      CategoryNotFoundException,
    );
    expect(categoriesRepository.setArchived).not.toHaveBeenCalled();
  });
});
