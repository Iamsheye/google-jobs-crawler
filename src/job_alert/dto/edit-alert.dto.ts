import {
  IsArray,
  IsOptional,
  IsString,
  ArrayMaxSize,
  MinLength,
  MaxLength,
} from 'class-validator';

export class EditJobAlertDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(24)
  includeWords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(24)
  omitWords?: string[];
}
