import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class GoogleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  code: string;
}
