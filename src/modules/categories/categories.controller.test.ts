import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CategoryType } from '@prisma/client';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryEntity } from './entities/category.entity';
import { JwtAccessPayload } from '../auth/jwt-payload.interface';

const fakeUser: JwtAccessPayload = { sub: 'u1', email: 'a@b.com', sid: 's1' };

const buildCategory = (
  overrides: Partial<CategoryEntity> = {},
): CategoryEntity =>
  new CategoryEntity({
    id: 'c1',
    userId: 'u1',
    type: CategoryType.EXPENSE,
    name: 'Alimentación',
    icon: 'tools-kitchen-2',
    color: '#F7901F',
    isArchived: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let categoriesService: {
    list: jest.Mock<CategoriesService['list']>;
    create: jest.Mock<CategoriesService['create']>;
    update: jest.Mock<CategoriesService['update']>;
    archive: jest.Mock<CategoriesService['archive']>;
    unarchive: jest.Mock<CategoriesService['unarchive']>;
    delete: jest.Mock<CategoriesService['delete']>;
  };

  beforeEach(() => {
    categoriesService = {
      list: jest.fn<CategoriesService['list']>(),
      create: jest.fn<CategoriesService['create']>(),
      update: jest.fn<CategoriesService['update']>(),
      archive: jest.fn<CategoriesService['archive']>(),
      unarchive: jest.fn<CategoriesService['unarchive']>(),
      delete: jest.fn<CategoriesService['delete']>(),
    };
    controller = new CategoriesController(
      categoriesService as unknown as CategoriesService,
    );
  });

  it('lists categories scoped to the current user and maps them to the response shape', async () => {
    categoriesService.list.mockResolvedValue([buildCategory()]);

    const result = await controller.list(fakeUser, {});

    expect(categoriesService.list).toHaveBeenCalledWith('u1', {});
    expect(result).toEqual([buildCategory().toResponse()]);
  });

  it('creates a category for the current user', async () => {
    const created = buildCategory();
    categoriesService.create.mockResolvedValue(created);
    const dto = {
      type: CategoryType.EXPENSE,
      name: 'Alimentación',
      icon: 'tools-kitchen-2',
      color: '#F7901F',
    };

    const result = await controller.create(fakeUser, dto);

    expect(categoriesService.create).toHaveBeenCalledWith('u1', dto);
    expect(result).toEqual(created.toResponse());
  });

  it('updates a category owned by the current user', async () => {
    const updated = buildCategory({ name: 'Comida' });
    categoriesService.update.mockResolvedValue(updated);

    const result = await controller.update(fakeUser, 'c1', { name: 'Comida' });

    expect(categoriesService.update).toHaveBeenCalledWith('c1', 'u1', {
      name: 'Comida',
    });
    expect(result).toEqual(updated.toResponse());
  });

  it('archives a category owned by the current user', async () => {
    const archived = buildCategory({ isArchived: true });
    categoriesService.archive.mockResolvedValue(archived);

    const result = await controller.archive(fakeUser, 'c1');

    expect(categoriesService.archive).toHaveBeenCalledWith('c1', 'u1');
    expect(result).toEqual(archived.toResponse());
  });

  it('unarchives a category owned by the current user', async () => {
    const unarchived = buildCategory({ isArchived: false });
    categoriesService.unarchive.mockResolvedValue(unarchived);

    const result = await controller.unarchive(fakeUser, 'c1');

    expect(categoriesService.unarchive).toHaveBeenCalledWith('c1', 'u1');
    expect(result).toEqual(unarchived.toResponse());
  });

  it('deletes a category owned by the current user', async () => {
    await controller.remove(fakeUser, 'c1');

    expect(categoriesService.delete).toHaveBeenCalledWith('c1', 'u1');
  });
});
