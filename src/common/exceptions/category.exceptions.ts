import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export class CategoryNotFoundException extends NotFoundException {
  constructor() {
    super('Category not found');
  }
}

export class CategoryNameAlreadyExistsException extends ConflictException {
  constructor() {
    super('A category with this name already exists for this type');
  }
}

export class CategoryNotArchivedException extends BadRequestException {
  constructor() {
    super('Only archived categories can be deleted');
  }
}
