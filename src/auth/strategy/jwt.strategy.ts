import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { EnvironmentVariables } from 'src/config/env.validation';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private config: ConfigService<EnvironmentVariables>,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.users.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        isPremium: true,
        email: true,
        name: true,
        googleId: true,
        createdAt: true,
        updatedAt: true,
        isVerified: true,
      },
    });

    return user;
  }
}
