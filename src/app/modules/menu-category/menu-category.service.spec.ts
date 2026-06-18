import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MenuCategoryService } from './menu-category.service';
import { MenuCategory } from './menu-category.entity';

describe('MenuCategoryService', () => {
  let service: MenuCategoryService;
  let repository: {
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuCategoryService,
        {
          provide: getRepositoryToken(MenuCategory),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(MenuCategoryService);
  });

  it('save creates category with audit fields', async () => {
    repository.save.mockImplementation(async (c) => ({ id: 1, ...c }));

    const result = await service.save(
      { nameAr: 'مشروبات', nameEn: 'Drinks', isActive: true },
      'admin',
    );

    expect(result.nameAr).toBe('مشروبات');
    expect(result.createdBy).toBe('admin');
  });

  it('findById returns undefined when missing', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findById(404)).resolves.toBeUndefined();
  });
});
