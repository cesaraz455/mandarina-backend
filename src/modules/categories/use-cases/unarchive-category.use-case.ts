import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from '../repositories/categories.repository';
import { CategoryEntity } from '../entities/category.entity';
import { CategoryNotFoundException } from '../../../common/exceptions/category.exceptions';

@Injectable()
export class UnarchiveCategoryUseCase {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute(id: string, userId: string): Promise<CategoryEntity> {
    const category = await this.categoriesRepository.findById(id, userId);
    if (!category) {
      throw new CategoryNotFoundException();
    }

    return this.categoriesRepository.setArchived(id, false);
  }
}
