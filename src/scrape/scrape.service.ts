import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { chromium } from 'playwright-chromium';
import { format, sub } from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';

type GetJobsArgs = {
  search: string;
  includeWords: string[];
  omitWords: string[];
  before: string;
  after: string;
};

const transformQuery = (
  type: 'include' | 'omit',
  query: string[],
): string | undefined => {
  if (!query.length) return '';
  return (
    ' ' +
    query
      ?.map((word) => (type === 'include' ? `"${word}"` : `-${word}`))
      .join(' ')
  );
};

type Job = {
  title: string;
  link: string;
  hostSite: string;
};

@Injectable()
export class ScrapeService {
  constructor(
    private prisma: PrismaService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}
  private readonly logger = new Logger('ANALYTICS');

  getPageUrl({ after, before, includeWords, omitWords, search }: GetJobsArgs) {
    const query = `site:workable.com | site:breezy.hr | site:recruitee.com | site:jobvite.com | site:jobs.smartrecruiters.com | site:icims.com | site:pinpointhq.com | site:lever.co | site:greenhouse.io | site:jobs.ashbyhq.com | site:app.dover.io ${search}${transformQuery(
      'include',
      includeWords,
    )}${transformQuery(
      'omit',
      omitWords,
    )}${` after:${after}`}${` before:${before}`}`;

    const googleUrl =
      `https://www.google.com/search?` +
      new URLSearchParams({
        q: query,
      }).toString();

    return googleUrl;
  }

  // @Cron(CronExpression.EVERY_5_SECONDS)
  // log() {
  //   this.logger.verbose(
  //     this.schedulerRegistry.getCronJob('Job Alerts').nextDates(5),
  //   );
  // }

  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'Job Alerts',
    timeZone: 'Africa/Lagos',
  })
  async handleCronJobAlerts() {
    const browser = await chromium.launch({ chromiumSandbox: false });

    const date = new Date();
    const before = format(date, 'yyyy-MM-dd');
    const after = format(sub(date, { days: 1 }), 'yyyy-MM-dd');

    const jobAlerts = await this.prisma.jobAlerts.findMany();
    let jobsAdded = 0;

    for (const alert of jobAlerts) {
      const url = this.getPageUrl({
        search: alert.search,
        includeWords: alert.includeWords,
        omitWords: alert.omitWords,
        before,
        after,
      });

      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'load' });

      const titles = await page.$$eval('h3.LC20lb.MBeuO.DKV0Md', (nodes) =>
        nodes.map((n) => n.textContent),
      );
      const hostSites = await page.$$eval('a span.VuuXrf', (nodes) =>
        nodes.map((n) => n.textContent),
      );
      const links = await page.$$eval('.MjjYud a', (nodes) =>
        nodes.map((n) => n.getAttribute('href')),
      );

      const jobs: Job[] = titles.map((title, i) => ({
        title,
        link: links[i],
        hostSite: hostSites[i],
      }));

      jobsAdded += jobs.length;
      await page.close();

      await this.prisma.$transaction(
        jobs.map((job) => {
          return this.prisma.jobs.create({
            data: {
              title: job.title,
              link: job.link,
              hostSite: job.hostSite,
              jobAlert: {
                connect: {
                  id: alert.id,
                },
              },
            },
          });
        }),
      );
    }
    // this.schedulerRegistry
    //   .getCronJob('Job Alerts')
    //   .setTime(new CronTime(CronExpression.EVERY_DAY_AT_2AM));

    this.logger.verbose(
      `TIME TO SCRAPE: ${new Date().getTime() - date.getTime()}ms`,
    );
    this.logger.verbose(
      `JOBS ADDED: ${jobsAdded}, Before: ${before}, After: ${after}`,
    );
  }
}
