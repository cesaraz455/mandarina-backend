import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from '../repositories/categories.repository';
import { CategoryEntity } from '../entities/category.entity';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import {
  CategoryNameAlreadyExistsException,
  CategoryNotFoundException,
} from '../../../common/exceptions/category.exceptions';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute(
    id: string,
    userId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryEntity> {
    const category = await this.categoriesRepository.findById(id, userId);
    if (!category) {
      throw new CategoryNotFoundException();
    }

    const nextType = dto.type ?? category.type;
    const nextName = dto.name ?? category.name;
    if (dto.name || dto.type) {
      const exists = await this.categoriesRepository.existsByName(
        userId,
        nextType,
        nextName,
        id,
      );
      if (exists) {
        throw new CategoryNameAlreadyExistsException();
      }
    }

    return this.categoriesRepository.update(id, {
      type: dto.type,
      name: dto.name,
      icon: dto.icon,
      color: dto.color,
    });
  }
}
