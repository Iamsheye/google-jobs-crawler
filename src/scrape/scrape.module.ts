import { Module } from '@nestjs/common';
import { ScrapeService } from './scrape.service';

@Module({
  providers: [ScrapeService],
})
export class ScrapeModule {}
