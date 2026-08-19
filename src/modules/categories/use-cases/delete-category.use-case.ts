import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from '../repositories/categories.repository';
import {
  CategoryNotArchivedException,
  CategoryNotFoundException,
} from '../../../common/exceptions/category.exceptions';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    const category = await this.categoriesRepository.findById(id, userId);
    if (!category) {
      throw new CategoryNotFoundException();
    }
    if (!category.isArchived) {
      throw new CategoryNotArchivedException();
    }

    await this.categoriesRepository.delete(id);
  }
}
