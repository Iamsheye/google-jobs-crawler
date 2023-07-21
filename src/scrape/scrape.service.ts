import { Injectable } from '@nestjs/common';
import { NestCrawlerService } from 'nest-crawler';

// Add cron to scrape jobs every day
// 5 0 * * *

const transformQuery = (
  type: 'include' | 'omit',
  query: string | string[],
): string | undefined => {
  if (query === undefined) return undefined;

  if (typeof query === 'string') {
    return ' ' + (type === 'include' ? `"${query}"` : `-${query}`);
  }
  return (
    ' ' +
    query
      ?.map((word) => {
        if (type === 'include') {
          return `"${word}"`;
        }
        return `-${word}`;
      })
      .join(' ')
  );
};

type Job = {
  title: string;
  url: string;
  description: string;
  site: string;
};

@Injectable()
export class ScrapeService {
  constructor(private readonly crawler: NestCrawlerService) {}

  async getJobs(
    search: string,
    includeWords?: string | string[],
    omitWords?: string | string[],
    after?: string,
  ) {
    const query = `site:lever.co | site:greenhouse.io | site:jobs.ashbyhq.com | site:app.dover.io ${search}${
      includeWords ? transformQuery('include', includeWords) : ''
    }${omitWords ? transformQuery('omit', omitWords) : ''}${
      after ? ` after:${after}` : ''
    }`;

    const googleUrl =
      `https://www.google.com/search?` +
      new URLSearchParams({
        q: query,
      }).toString();

    console.log({ googleUrl });

    const jobs: Job = await this.crawler.fetch({
      target: googleUrl,
      waitFor: 1 * 1000,
      fetch: {
        title: {
          listItem: 'h3.LC20lb.MBeuO.DKV0Md',
        },
        url: {
          listItem: '.MjjYud a',
          data: {
            url: {
              attr: 'href',
            },
          },
          convert: (link) => link.url,
        },
        description: {
          listItem: '.VwiC3b.yXK7lf.MUxGbd.yDYNvb.lyLwlc.lEBKkf span',
          how: 'html',
        },
        site: {
          listItem: 'a span.VuuXrf',
        },
      },
    });

    const jobsArray = Array.from({ length: jobs.title.length }, (_, i) => ({
      title: jobs.title[i],
      url: jobs.url[i],
      description: jobs.description[i],
      site: jobs.site[i],
    }));

    return jobsArray;
  }
}
