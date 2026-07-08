import { chromium } from 'playwright-chromium';
import { ScrapeService } from './scrape.service';

jest.mock('playwright-chromium', () => ({
  chromium: {
    launch: jest.fn(),
  },
}));

describe('ScrapeService', () => {
  const launch = chromium.launch as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createPrisma = () => ({
    $queryRaw: jest.fn(),
    jobAlerts: {
      findMany: jest.fn(),
    },
    jobs: {
      createMany: jest.fn(),
    },
  });

  it('skips scraping when another worker owns the distributed lock', async () => {
    const prisma = createPrisma();
    prisma.$queryRaw.mockResolvedValueOnce([{ locked: false }]);

    const service = new ScrapeService(prisma as any);
    (service as any).logger = {
      warn: jest.fn(),
      error: jest.fn(),
      verbose: jest.fn(),
    };

    await service.handleCronJobAlerts();

    expect(launch).not.toHaveBeenCalled();
    expect(prisma.jobAlerts.findMany).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('caps pagination per alert, writes idempotently, and closes pages and browser', async () => {
    const prisma = createPrisma();
    prisma.$queryRaw
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);
    prisma.jobAlerts.findMany.mockResolvedValue([
      {
        id: 'alert-id',
        search: 'backend engineer',
        includeWords: [],
        omitWords: [],
      },
    ]);
    prisma.jobs.createMany.mockResolvedValue({ count: 1 });

    const pages = Array.from({ length: 5 }, (_, pageIndex) => ({
      setDefaultTimeout: jest.fn(),
      goto: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      $$eval: jest.fn((selector: string) => {
        if (selector.includes('h3')) return [`Backend Engineer ${pageIndex}`];
        if (selector.includes('VuuXrf')) return ['Lever'];
        return [`https://jobs.example/${pageIndex}`];
      }),
    }));
    const browser = {
      newPage: jest.fn(() => pages[browser.newPage.mock.calls.length - 1]),
      close: jest.fn().mockResolvedValue(undefined),
    };
    launch.mockResolvedValue(browser);

    const service = new ScrapeService(prisma as any);
    (service as any).logger = {
      warn: jest.fn(),
      error: jest.fn(),
      verbose: jest.fn(),
    };

    await service.handleCronJobAlerts();

    expect(browser.newPage).toHaveBeenCalledTimes(5);
    expect(prisma.jobs.createMany).toHaveBeenCalledTimes(5);
    expect(prisma.jobs.createMany).toHaveBeenCalledWith({
      data: [
        {
          title: 'Backend Engineer 0',
          link: 'https://jobs.example/0',
          hostSite: 'Lever',
          jobAlertId: 'alert-id',
        },
      ],
      skipDuplicates: true,
    });
    expect(pages.every((page) => page.close.mock.calls.length === 1)).toBe(
      true,
    );
    expect(browser.close).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('closes a page when scraping that page fails', async () => {
    const prisma = createPrisma();
    const page = {
      setDefaultTimeout: jest.fn(),
      goto: jest.fn().mockRejectedValue(new Error('navigation failed')),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const browser = {
      newPage: jest.fn().mockResolvedValue(page),
    };

    const service = new ScrapeService(prisma as any);
    (service as any).logger = {
      warn: jest.fn(),
      error: jest.fn(),
      verbose: jest.fn(),
    };

    await expect(
      (service as any).scrapePage(browser, 'https://example.com'),
    ).rejects.toThrow('navigation failed');

    expect(page.close).toHaveBeenCalledTimes(1);
  });
});
