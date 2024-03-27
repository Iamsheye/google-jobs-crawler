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
  ) {}

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

    return {
      ...userData,
      token: await this.signToken({
        email: user.email,
        name: user.name,
        isPremium: user.isPremium,
        sub: user.id,
      }),
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

    return {
      ...userData,
      token: await this.signToken({
        email: user.email,
        name: user.name,
        isPremium: user.isPremium,
        sub: user.id,
      }),
    };
  }

  signToken(user: Omit<CurrentUser, 'id'> & { sub: string }) {
    return this.jwt.signAsync(user, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '7d',
    });
  }
}
