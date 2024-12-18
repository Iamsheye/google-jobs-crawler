import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as argon from 'argon2';
import { Prisma } from '@prisma/client';
import { SignUpDto, SignInDto, GoogleDto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import { CurrentUser } from 'src/types/user';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from 'src/mail/mail.service';

const oAuth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_SECRET,
  'postmessage',
);

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  async verifyEmail(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new ForbiddenException('Invalid verification link');
    }

    if (user.isVerified) {
      throw new ForbiddenException('Email is already verified');
    }

    await this.prisma.users.update({
      where: { id },
      data: { isVerified: true },
    });

    return { message: 'Email has been verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        message: 'If the email exists, a password reset link has been sent.',
      };
    }

    const resetToken = uuidv4();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    await this.mail.sendPasswordResetEmail(user.email, resetToken);

    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.users.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new ForbiddenException('Invalid or expired reset token');
    }

    const hashedPassword = await argon.hash(newPassword);

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password has been reset successfully' };
  }

  async signup(dto: SignUpDto) {
    const hashedPassword = await argon.hash(dto.password);

    try {
      const user = await this.prisma.users.create({
        data: {
          email: dto.email,
          name: dto.name,
          hashedPassword,
        },
      });

      await this.mail.sendVerificationEmail(user.email, user.id);

      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ConflictException('Unable to signup');
        }
      }

      throw e;
    }
  }

  async signin(dto: SignInDto) {
    const user = await this.prisma.users.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new ForbiddenException('Invalid credentials');
    }

    if (!user.hashedPassword && user.googleId) {
      throw new ForbiddenException(
        'This account was created with Google, please use Google sign-in and set a password.',
      );
    }

    const isPasswordValid = await argon.verify(
      user.hashedPassword,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new ForbiddenException('Invalid credentials');
    }

    if (!user.isLoginAllowed) {
      throw new ForbiddenException(
        'This account has been restricted, please reach out to support',
      );
    }

    const userData: CurrentUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      isPremium: user.isPremium,
    };

    const token = await this.signToken({
      email: user.email,
      name: user.name,
      isPremium: user.isPremium,
      sub: user.id,
    });

    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      ...userData,
      token,
      refreshToken,
    };
  }

  async googleLogin(dto: GoogleDto) {
    const response = await oAuth2Client.getToken(dto.code);

    // Get user info from google with code
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: response.tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const googleId = ticket.getUserId();
    const { name, email } = ticket.getPayload();

    // Check if user exists
    let user = await this.prisma.users.findUnique({
      where: {
        email,
      },
    });

    // If user exists, check if googleId is set
    if (user && !user.googleId) {
      await this.prisma.users.update({
        where: {
          id: user.id,
        },
        data: {
          googleId,
        },
      });
    }

    // If user does not exist, create user
    if (!user) {
      user = await this.prisma.users.create({
        data: {
          email,
          name,
          googleId,
          isVerified: true,
        },
      });
    }

    const userData: CurrentUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      isPremium: user.isPremium,
    };

    if (!user.isLoginAllowed) {
      throw new ForbiddenException(
        'This account has been restricted, please reach out to support',
      );
    }

    const token = await this.signToken({
      email: user.email,
      name: user.name,
      isPremium: user.isPremium,
      sub: user.id,
    });

    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      ...userData,
      token,
      refreshToken,
    };
  }

  signToken(user: Omit<CurrentUser, 'id'> & { sub: string }) {
    return this.jwt.signAsync(user, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '4h',
    });
  }

  async refreshToken(token: string) {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (
      !refreshToken ||
      !refreshToken.isValid ||
      refreshToken.expiresAt < new Date()
    ) {
      throw new ForbiddenException('Invalid refresh token');
    }

    // Token Rotation: Invalidate the old refresh token
    await this.prisma.refreshToken.update({
      where: { token },
      data: { isValid: false },
    });

    const payload = this.jwt.verify(token, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
    });

    // Retrieve user information using the userId (sub)
    const user = await this.prisma.users.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const newAccessToken = await this.signToken({
      email: user.email,
      name: user.name,
      isPremium: user.isPremium,
      sub: user.id,
    });

    const newRefreshToken = await this.generateRefreshToken(user.id);

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async generateRefreshToken(userId: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const refreshToken = await this.jwt.signAsync(
          { sub: userId },
          {
            secret: this.config.get('JWT_REFRESH_SECRET'),
            expiresIn: '7d',
          },
        );

        await this.prisma.refreshToken.create({
          data: {
            userId,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          },
        });

        return refreshToken;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          attempts++;
          continue;
        }
        throw error;
      }
    }

    throw new Error(
      'Failed to generate unique refresh token after multiple attempts',
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredTokens() {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        isValid: false,
      },
    });
  }
}
