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
import { MailService } from 'src/mail/mail.service';
import { EnvironmentVariables } from 'src/config/env.validation';
import {
  hashToken,
  newResetToken,
  newVerificationToken,
  REFRESH_TOKEN_TTL_MS,
} from './token.util';

@Injectable()
export class AuthService {
  private readonly oAuth2Client: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService<EnvironmentVariables>,
    private jwt: JwtService,
    private mail: MailService,
  ) {
    this.oAuth2Client = new OAuth2Client(
      this.config.getOrThrow('GOOGLE_CLIENT_ID'),
      this.config.getOrThrow('GOOGLE_SECRET'),
      'postmessage',
    );
  }

  async verifyEmail(token: string) {
    const hashedToken = hashToken(token);

    const user = await this.prisma.users.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new ForbiddenException('Invalid or expired verification link');
    }

    if (user.isVerified) {
      throw new ForbiddenException('Email is already verified');
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      },
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

    const { rawToken, hashedToken, expiresAt } = newResetToken();

    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: expiresAt,
      },
    });

    await this.mail.sendPasswordResetEmail(user.email, rawToken);

    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = hashToken(token);

    const user = await this.prisma.users.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new ForbiddenException('Invalid or expired reset token');
    }

    const hashedPassword = await argon.hash(newPassword);

    // Update the password, clear the reset token, and revoke every existing
    // refresh token for this user atomically so a credential change fully
    // invalidates prior sessions.
    await this.prisma.$transaction([
      this.prisma.users.update({
        where: { id: user.id },
        data: {
          hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, isValid: true },
        data: { isValid: false },
      }),
    ]);

    return { message: 'Password has been reset successfully' };
  }

  async signup(dto: SignUpDto) {
    const hashedPassword = await argon.hash(dto.password);

    try {
      const { rawToken, hashedToken, expiresAt } = newVerificationToken();

      const user = await this.prisma.users.create({
        data: {
          email: dto.email,
          name: dto.name,
          hashedPassword,
          emailVerificationToken: hashedToken,
          emailVerificationTokenExpiry: expiresAt,
        },
      });

      await this.mail.sendVerificationEmail(user.email, rawToken);

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
    const response = await this.oAuth2Client.getToken(dto.code);

    // Get user info from google with code
    const ticket = await this.oAuth2Client.verifyIdToken({
      idToken: response.tokens.id_token,
      audience: this.config.getOrThrow('GOOGLE_CLIENT_ID'),
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
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn: '4h',
    });
  }

  async refreshToken(token: string) {
    const hashedToken = hashToken(token);

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: hashedToken },
    });

    if (
      !refreshToken ||
      !refreshToken.isValid ||
      refreshToken.expiresAt < new Date()
    ) {
      throw new ForbiddenException('Invalid refresh token');
    }

    const payload = this.jwt.verify(token, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
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

    // Token rotation: invalidate the presented refresh token and mint a
    // replacement inside a single transaction so a failure during issuance
    // cannot leave the user with no valid token (or the old token still
    // valid).
    const newRefreshToken = await this.rotateRefreshToken(
      refreshToken.id,
      user.id,
    );

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
            secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
            expiresIn: REFRESH_TOKEN_TTL_MS / 1000,
          },
        );

        await this.prisma.refreshToken.create({
          data: {
            userId,
            token: hashToken(refreshToken),
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
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

  /**
   * Invalidate the presented refresh token and issue a fresh one within a
   * transaction. The raw new token is returned to the caller; only its hash
   * is persisted.
   */
  private async rotateRefreshToken(
    currentTokenId: string,
    userId: string,
  ): Promise<string> {
    const newRefreshToken = await this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TOKEN_TTL_MS / 1000,
      },
    );

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: currentTokenId },
        data: { isValid: false },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId,
          token: hashToken(newRefreshToken),
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      }),
    ]);

    return newRefreshToken;
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
