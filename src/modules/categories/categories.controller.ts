import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories.query.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAccessPayload } from '../auth/jwt-payload.interface';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user categories' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async list(
    @CurrentUser() user: JwtAccessPayload,
    @Query() query: ListCategoriesQueryDto,
  ): Promise<CategoryResponseDto[]> {
    const categories = await this.categoriesService.list(user.sub, query);
    return categories.map((category) => category.toResponse());
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a category' })
  @ApiResponse({ status: 201, type: CategoryResponseDto })
  @ApiResponse({
    status: 409,
    description: 'A category with this name already exists for this type',
  })
  async create(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoriesService.create(user.sub, dto);
    return category.toResponse();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({
    status: 409,
    description: 'A category with this name already exists for this type',
  })
  async update(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoriesService.update(id, user.sub, dto);
    return category.toResponse();
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a category' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async archive(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id') id: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoriesService.archive(id, user.sub);
    return category.toResponse();
  }

  @Post(':id/unarchive')
  @ApiOperation({ summary: 'Unarchive a category' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async unarchive(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id') id: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoriesService.unarchive(id, user.sub);
    return category.toResponse();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category (must be archived first)' })
  @ApiResponse({ status: 204, description: 'Category deleted' })
  @ApiResponse({
    status: 400,
    description: 'Only archived categories can be deleted',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async remove(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id') id: string,
  ): Promise<void> {
    await this.categoriesService.delete(id, user.sub);
  }
}
