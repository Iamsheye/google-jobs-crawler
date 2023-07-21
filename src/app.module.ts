import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScrapeModule } from './scrape/scrape.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScrapeModule,
    UsersModule,
    AuthModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
