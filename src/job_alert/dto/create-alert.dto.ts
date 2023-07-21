import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateJobAlertDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  search: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString({ each: true })
  includeWords?: string[];

  @IsOptional()
  @IsString({ each: true })
  omitWords?: string[];
}
