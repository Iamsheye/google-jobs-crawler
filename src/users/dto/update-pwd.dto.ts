import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdatePwdDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  oldPassword: string;
}
