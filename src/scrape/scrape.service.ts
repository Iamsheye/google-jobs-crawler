import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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

const SCRAPE_LOCK_KEY = 852391047;
const MAX_PAGES_PER_ALERT = 2;
const GOOGLE_RESULTS_PER_PAGE = 10;
const PAGE_TIMEOUT_MS = 20_000;
const SCRAPE_RETRY_ATTEMPTS = 3;
const SCRAPE_RETRY_BACKOFF_MS = 1_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class ScrapeService {
  constructor(private prisma: PrismaService) {}
  private readonly logger = new Logger('ANALYTICS');

  getPageUrl(
    { after, before, includeWords, omitWords, search }: GetJobsArgs,
    start: number,
  ) {
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
        start: start.toString(),
      }).toString();

    return googleUrl;
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'Job Alerts',
    timeZone: 'Africa/Lagos',
  })
  async handleCronJobAlerts() {
    const date = new Date();
    const before = format(date, 'yyyy-MM-dd');
    const after = format(sub(date, { days: 1 }), 'yyyy-MM-dd');
    let browser: Awaited<ReturnType<typeof chromium.launch>>;

    const hasLock = await this.acquireScrapeLock();
    if (!hasLock) {
      this.logger.warn(
        'Skipping job alert scrape because another worker owns the lock',
      );
      return;
    }

    try {
      browser = await chromium.launch({ chromiumSandbox: false });
      const jobAlerts = await this.prisma.jobAlerts.findMany();
      let jobsAdded = 0;

      for (const alert of jobAlerts) {
        let hasMoreResults = true;

        for (
          let pageIndex = 0;
          hasMoreResults && pageIndex < MAX_PAGES_PER_ALERT;
          pageIndex += 1
        ) {
          const url = this.getPageUrl(
            {
              search: alert.search,
              includeWords: alert.includeWords,
              omitWords: alert.omitWords,
              before,
              after,
            },
            pageIndex * GOOGLE_RESULTS_PER_PAGE,
          );

          let jobs: Job[] = [];

          try {
            jobs = await this.scrapePageWithRetry(browser, url);
          } catch (error) {
            this.logger.error(
              `Failed to scrape alert ${alert.id} after retries`,
              error?.stack,
            );
            break;
          }

          if (jobs.length) {
            const { count } = await this.prisma.jobs.createMany({
              data: jobs.map((job) => ({
                title: job.title,
                link: job.link,
                hostSite: job.hostSite,
                jobAlertId: alert.id,
              })),
              skipDuplicates: true,
            });
            jobsAdded += count;
          }

          hasMoreResults = jobs.length > 0;
        }

        if (hasMoreResults) {
          this.logger.warn(
            `Reached ${MAX_PAGES_PER_ALERT} page limit for alert ${alert.id}`,
          );
        }
      }

      this.logger.verbose(
        `TIME TO SCRAPE: ${new Date().getTime() - date.getTime()}ms`,
      );
      this.logger.verbose(
        `JOBS ADDED: ${jobsAdded}, Before: ${before}, After: ${after}`,
      );
    } finally {
      if (browser) {
        await browser.close().catch((error) => {
          this.logger.error('Failed to close scraper browser', error?.stack);
        });
      }
      await this.releaseScrapeLock().catch((error) => {
        this.logger.error('Failed to release scraper lock', error?.stack);
      });
    }
  }

  private async scrapePageWithRetry(
    browser: Awaited<ReturnType<typeof chromium.launch>>,
    url: string,
  ) {
    let lastError: Error;

    for (let attempt = 1; attempt <= SCRAPE_RETRY_ATTEMPTS; attempt += 1) {
      try {
        return await this.scrapePage(browser, url);
      } catch (error) {
        lastError = error;
        if (attempt === SCRAPE_RETRY_ATTEMPTS) break;

        this.logger.warn(
          `Retrying scrape page after failure (${attempt}/${SCRAPE_RETRY_ATTEMPTS})`,
        );
        await delay(SCRAPE_RETRY_BACKOFF_MS * attempt);
      }
    }

    throw lastError;
  }

  private async scrapePage(
    browser: Awaited<ReturnType<typeof chromium.launch>>,
    url: string,
  ): Promise<Job[]> {
    const page = await browser.newPage();

    try {
      page.setDefaultTimeout(PAGE_TIMEOUT_MS);
      await page.goto(url, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });

      const titles = await page.$$eval('h3.LC20lb.MBeuO.DKV0Md', (nodes) =>
        nodes.map((n) => n.textContent),
      );
      const hostSites = await page.$$eval('a span.VuuXrf', (nodes) =>
        nodes.map((n) => n.textContent),
      );
      const links = await page.$$eval('.MjjYud a', (nodes) =>
        nodes.map((n) => n.getAttribute('href')),
      );

      return titles
        .map((title, i) => ({
          title,
          link: links[i],
          hostSite: hostSites[i],
        }))
        .filter((job) => job.title && job.link && job.hostSite);
    } finally {
      await page.close().catch((error) => {
        this.logger.error('Failed to close scraper page', error?.stack);
      });
    }
  }

  private async acquireScrapeLock() {
    const [result] = await this.prisma.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_lock(${SCRAPE_LOCK_KEY}) AS locked
    `;

    return result?.locked ?? false;
  }

  private async releaseScrapeLock() {
    await this.prisma.$queryRaw`
      SELECT pg_advisory_unlock(${SCRAPE_LOCK_KEY})
    `;
  }
}
