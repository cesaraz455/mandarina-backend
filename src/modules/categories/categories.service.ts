import { Injectable } from '@nestjs/common';
import { CategoryEntity } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories.query.dto';
import { ListCategoriesUseCase } from './use-cases/list-categories.use-case';
import { CreateCategoryUseCase } from './use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from './use-cases/update-category.use-case';
import { ArchiveCategoryUseCase } from './use-cases/archive-category.use-case';
import { UnarchiveCategoryUseCase } from './use-cases/unarchive-category.use-case';
import { DeleteCategoryUseCase } from './use-cases/delete-category.use-case';
import { SeedDefaultCategoriesUseCase } from './use-cases/seed-default-categories.use-case';

/**
 * Pure facade: forwards calls to the appropriate use case. Controllers talk
 * only to this service, following the same pattern as AuthService.
 */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly archiveCategoryUseCase: ArchiveCategoryUseCase,
    private readonly unarchiveCategoryUseCase: UnarchiveCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly seedDefaultCategoriesUseCase: SeedDefaultCategoriesUseCase,
  ) {}

  list(
    userId: string,
    query: ListCategoriesQueryDto,
  ): Promise<CategoryEntity[]> {
    return this.listCategoriesUseCase.execute(userId, {
      type: query.type,
      isArchived: query.archived,
    });
  }

  create(userId: string, dto: CreateCategoryDto): Promise<CategoryEntity> {
    return this.createCategoryUseCase.execute(userId, dto);
  }

  update(
    id: string,
    userId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryEntity> {
    return this.updateCategoryUseCase.execute(id, userId, dto);
  }

  archive(id: string, userId: string): Promise<CategoryEntity> {
    return this.archiveCategoryUseCase.execute(id, userId);
  }

  unarchive(id: string, userId: string): Promise<CategoryEntity> {
    return this.unarchiveCategoryUseCase.execute(id, userId);
  }

  delete(id: string, userId: string): Promise<void> {
    return this.deleteCategoryUseCase.execute(id, userId);
  }

  seedDefaults(userId: string): Promise<void> {
    return this.seedDefaultCategoriesUseCase.execute(userId);
  }
}
