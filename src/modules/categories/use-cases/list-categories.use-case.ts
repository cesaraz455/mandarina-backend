import { Injectable } from '@nestjs/common';
import {
  CategoriesRepository,
  ListCategoriesFilter,
} from '../repositories/categories.repository';
import { CategoryEntity } from '../entities/category.entity';

@Injectable()
export class ListCategoriesUseCase {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute(
    userId: string,
    filter: ListCategoriesFilter,
  ): Promise<CategoryEntity[]> {
    return this.categoriesRepository.findAllByUserId(userId, filter);
  }
}
