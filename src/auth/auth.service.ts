import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import * as argon from 'argon2';
import { Prisma } from '@prisma/client';
import { SignUpDto, SignInDto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CurrentUser } from 'src/types/user';

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

  signToken(user: Omit<CurrentUser, 'id'> & { sub: string }) {
    return this.jwt.signAsync(user, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '7d',
    });
  }
}
