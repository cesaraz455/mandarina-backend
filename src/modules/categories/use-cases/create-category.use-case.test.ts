import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CategoryType } from '@prisma/client';
import { CreateCategoryUseCase } from './create-category.use-case';
import { CategoriesRepository } from '../repositories/categories.repository';
import { CategoryEntity } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { CategoryNameAlreadyExistsException } from '../../../common/exceptions/category.exceptions';

const dto: CreateCategoryDto = {
  type: CategoryType.EXPENSE,
  name: 'Alimentación',
  icon: 'tools-kitchen-2',
  color: '#F7901F',
};

describe('CreateCategoryUseCase', () => {
  let categoriesRepository: {
    existsByName: jest.Mock<CategoriesRepository['existsByName']>;
    create: jest.Mock<CategoriesRepository['create']>;
  };
  let useCase: CreateCategoryUseCase;

  beforeEach(() => {
    categoriesRepository = {
      existsByName: jest.fn<CategoriesRepository['existsByName']>(),
      create: jest.fn<CategoriesRepository['create']>(),
    };
    useCase = new CreateCategoryUseCase(
      categoriesRepository as unknown as CategoriesRepository,
    );
  });

  it('creates the category when the name is not taken for the type', async () => {
    categoriesRepository.existsByName.mockResolvedValue(false);
    const created = new CategoryEntity({
      id: 'c1',
      userId: 'u1',
      type: dto.type,
      name: dto.name,
      icon: dto.icon,
      color: dto.color,
      isArchived: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    categoriesRepository.create.mockResolvedValue(created);

    const result = await useCase.execute('u1', dto);

    expect(categoriesRepository.existsByName).toHaveBeenCalledWith(
      'u1',
      dto.type,
      dto.name,
    );
    expect(categoriesRepository.create).toHaveBeenCalledWith({
      userId: 'u1',
      type: dto.type,
      name: dto.name,
      icon: dto.icon,
      color: dto.color,
    });
    expect(result).toEqual(created);
  });

  it('throws CategoryNameAlreadyExistsException when the name is already taken for the type', async () => {
    categoriesRepository.existsByName.mockResolvedValue(true);

    await expect(useCase.execute('u1', dto)).rejects.toThrow(
      CategoryNameAlreadyExistsException,
    );
    expect(categoriesRepository.create).not.toHaveBeenCalled();
  });
});
