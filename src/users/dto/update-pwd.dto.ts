import { IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class UpdatePwdDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  oldPassword: string;
}
