import { ApiProperty } from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';

export class CategoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: CategoryType }) type!: CategoryType;
  @ApiProperty() name!: string;
  @ApiProperty() icon!: string;
  @ApiProperty() color!: string;
  @ApiProperty() isArchived!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
