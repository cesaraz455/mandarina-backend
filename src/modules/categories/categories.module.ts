import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './repositories/categories.repository';
import { ListCategoriesUseCase } from './use-cases/list-categories.use-case';
import { CreateCategoryUseCase } from './use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from './use-cases/update-category.use-case';
import { ArchiveCategoryUseCase } from './use-cases/archive-category.use-case';
import { UnarchiveCategoryUseCase } from './use-cases/unarchive-category.use-case';
import { DeleteCategoryUseCase } from './use-cases/delete-category.use-case';
import { SeedDefaultCategoriesUseCase } from './use-cases/seed-default-categories.use-case';

@Module({
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    CategoriesRepository,
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    ArchiveCategoryUseCase,
    UnarchiveCategoryUseCase,
    DeleteCategoryUseCase,
    SeedDefaultCategoriesUseCase,
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}
