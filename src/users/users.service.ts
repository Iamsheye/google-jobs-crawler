import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as argon from 'argon2';
import { PrismaService } from 'src/prisma/prisma.service';
import { EditUserDto, UpdatePremiumDto, UpdatePwdDto } from './dto';
import { CurrentUser } from 'src/types/user';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async sendVerificationEmail(user: CurrentUser) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    await this.mail.sendVerificationEmail(user.email, user.id);

    return;
  }

  async updateMyProfile(id: string, updateUserDto: EditUserDto) {
    const newUser = await this.prisma.users.update({
      where: { id },
      data: { ...updateUserDto },
    });
    delete newUser.hashedPassword;

    return newUser;
  }

  async updatePassword(id: string, updatePwdDto: UpdatePwdDto) {
    const user = await this.prisma.users.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.hashedPassword) {
      if (!updatePwdDto.oldPassword) {
        throw new BadRequestException('Old password is required');
      }

      if (updatePwdDto.oldPassword === updatePwdDto.newPassword) {
        throw new UnprocessableEntityException(
          'Old and new password cannot be the same',
        );
      }

      const isPasswordValid = await argon.verify(
        user.hashedPassword,
        updatePwdDto.oldPassword,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid old password');
      }

      const hashedPassword = await argon.hash(updatePwdDto.newPassword);

      await this.prisma.users.update({
        where: {
          id,
        },
        data: {
          hashedPassword,
        },
      });

      return;
    } else {
      const hashedPassword = await argon.hash(updatePwdDto.newPassword);

      await this.prisma.users.update({
        where: {
          id,
        },
        data: {
          hashedPassword,
        },
      });

      return;
    }
  }

  async updatePremium(id: string, updatePremiumDto: UpdatePremiumDto) {
    const newUser = await this.prisma.users.update({
      where: { id },
      data: {
        isPremium: updatePremiumDto.isPremium,
      },
    });

    delete newUser.hashedPassword;
    return newUser;
  }
}
