import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from '../repositories/categories.repository';
import { DEFAULT_CATEGORIES } from '../constants/default-categories.constant';

/**
 * Called only from RegisterUseCase, not exposed over HTTP: seeds every new
 * user with the default expense/income category set.
 */
@Injectable()
export class SeedDefaultCategoriesUseCase {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute(userId: string): Promise<void> {
    await this.categoriesRepository.createMany(userId, DEFAULT_CATEGORIES);
  }
}
