import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SeedDefaultCategoriesUseCase } from './seed-default-categories.use-case';
import { CategoriesRepository } from '../repositories/categories.repository';
import { DEFAULT_CATEGORIES } from '../constants/default-categories.constant';

describe('SeedDefaultCategoriesUseCase', () => {
  let categoriesRepository: {
    createMany: jest.Mock<CategoriesRepository['createMany']>;
  };
  let useCase: SeedDefaultCategoriesUseCase;

  beforeEach(() => {
    categoriesRepository = {
      createMany: jest.fn<CategoriesRepository['createMany']>(),
    };
    useCase = new SeedDefaultCategoriesUseCase(
      categoriesRepository as unknown as CategoriesRepository,
    );
  });

  it('creates the full default category set for the user', async () => {
    await useCase.execute('u1');

    expect(categoriesRepository.createMany).toHaveBeenCalledWith(
      'u1',
      DEFAULT_CATEGORIES,
    );
  });
});
