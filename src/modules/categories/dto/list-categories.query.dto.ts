import { ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({ enum: CategoryType })
  @IsOptional()
  @IsEnum(CategoryType, { message: 'type must be either EXPENSE or INCOME' })
  type?: CategoryType;

  @ApiPropertyOptional({
    description:
      'Filter by archived state. Omit to return both archived and active.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value === 'true' : value,
  )
  @IsBoolean()
  archived?: boolean;
}
