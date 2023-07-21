import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { ScrapeService } from './scrape.service';

@ApiTags('Scrape')
@Controller('scrape')
export class ScrapeController {
  constructor(private readonly ScrapeService: ScrapeService) {}

  @ApiQuery({
    name: 'search',
    required: true,
    type: String,
    description: 'Search term',
  })
  @ApiQuery({
    name: 'includeWords',
    required: false,
    type: [String],
    description: 'Words to include',
  })
  @ApiQuery({
    name: 'omitWords',
    required: false,
    type: [String],
    description: 'Words to omit',
  })
  @ApiQuery({
    name: 'after',
    required: false,
    type: String,
    description: 'only show jobs posted after this date (YYYY-MM-DD)',
  })
  @Get('jobs')
  getJobs(
    @Query('search') search: string,
    @Query('includeWords') includeWords?: string[],
    @Query('omitWords') omitWords?: string[],
    @Query('after') after?: string,
  ) {
    return this.ScrapeService.getJobs(search, includeWords, omitWords, after);
  }
}
