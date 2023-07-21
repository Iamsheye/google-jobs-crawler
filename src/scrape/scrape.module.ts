import { Module } from '@nestjs/common';
import { ScrapeController } from './scrape.controller';
import { ScrapeService } from './scrape.service';
import { NestCrawlerModule } from 'nest-crawler';

@Module({
  imports: [NestCrawlerModule],
  controllers: [ScrapeController],
  providers: [ScrapeService],
})
export class ScrapeModule {}
