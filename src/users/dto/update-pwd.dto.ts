import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdatePwdDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  @MaxLength(128)
  oldPassword?: string;
}
