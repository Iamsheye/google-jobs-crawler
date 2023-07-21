import { IsOptional, IsString } from 'class-validator';

export class EditJobAlertDto {
  @IsOptional()
  @IsString()
  name?: string;

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
