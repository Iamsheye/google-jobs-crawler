import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdatePremiumDto {
  @IsBoolean()
  @IsNotEmpty()
  isPremium: boolean;
}
