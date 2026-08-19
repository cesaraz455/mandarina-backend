import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CategoryType } from '@prisma/client';
import { UpdateCategoryUseCase } from './update-category.use-case';
import { CategoriesRepository } from '../repositories/categories.repository';
import { CategoryEntity } from '../entities/category.entity';
import {
  CategoryNameAlreadyExistsException,
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
    isArchived: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

describe('UpdateCategoryUseCase', () => {
  let categoriesRepository: {
    findById: jest.Mock<CategoriesRepository['findById']>;
    existsByName: jest.Mock<CategoriesRepository['existsByName']>;
    update: jest.Mock<CategoriesRepository['update']>;
  };
  let useCase: UpdateCategoryUseCase;

  beforeEach(() => {
    categoriesRepository = {
      findById: jest.fn<CategoriesRepository['findById']>(),
      existsByName: jest.fn<CategoriesRepository['existsByName']>(),
      update: jest.fn<CategoriesRepository['update']>(),
    };
    useCase = new UpdateCategoryUseCase(
      categoriesRepository as unknown as CategoriesRepository,
    );
  });

  it('throws CategoryNotFoundException when the category does not belong to the user', async () => {
    categoriesRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('c1', 'u1', { name: 'Nueva' }),
    ).rejects.toThrow(CategoryNotFoundException);
    expect(categoriesRepository.update).not.toHaveBeenCalled();
  });

  it('throws CategoryNameAlreadyExistsException when renaming to a taken name', async () => {
    categoriesRepository.findById.mockResolvedValue(buildCategory());
    categoriesRepository.existsByName.mockResolvedValue(true);

    await expect(
      useCase.execute('c1', 'u1', { name: 'Educación' }),
    ).rejects.toThrow(CategoryNameAlreadyExistsException);
    expect(categoriesRepository.existsByName).toHaveBeenCalledWith(
      'u1',
      CategoryType.EXPENSE,
      'Educación',
      'c1',
    );
    expect(categoriesRepository.update).not.toHaveBeenCalled();
  });

  it('skips the uniqueness check when neither name nor type change', async () => {
    categoriesRepository.findById.mockResolvedValue(buildCategory());
    const updated = buildCategory({ icon: 'car' });
    categoriesRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute('c1', 'u1', { icon: 'car' });

    expect(categoriesRepository.existsByName).not.toHaveBeenCalled();
    expect(categoriesRepository.update).toHaveBeenCalledWith('c1', {
      type: undefined,
      name: undefined,
      icon: 'car',
      color: undefined,
    });
    expect(result).toEqual(updated);
  });
});
