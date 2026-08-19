import { ApiProperty } from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty({ enum: CategoryType, example: CategoryType.EXPENSE })
  @IsEnum(CategoryType, { message: 'type must be either EXPENSE or INCOME' })
  type!: CategoryType;

  @ApiProperty({ example: 'Alimentación' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  name!: string;

  @ApiProperty({
    example: 'tools-kitchen-2',
    description: 'Tabler icon slug, without the "ti-" prefix',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  icon!: string;

  @ApiProperty({
    example: '#F7901F',
    description: 'Hex color for the icon background',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  color!: string;
}
