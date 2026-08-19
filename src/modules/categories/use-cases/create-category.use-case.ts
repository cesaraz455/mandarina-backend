import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from '../repositories/categories.repository';
import { CategoryEntity } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { CategoryNameAlreadyExistsException } from '../../../common/exceptions/category.exceptions';

@Injectable()
export class CreateCategoryUseCase {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async execute(
    userId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryEntity> {
    const exists = await this.categoriesRepository.existsByName(
      userId,
      dto.type,
      dto.name,
    );
    if (exists) {
      throw new CategoryNameAlreadyExistsException();
    }

    return this.categoriesRepository.create({
      userId,
      type: dto.type,
      name: dto.name,
      icon: dto.icon,
      color: dto.color,
    });
  }
}
