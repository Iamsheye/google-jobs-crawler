import { JobAlertService } from './job_alert.service';

describe('JobAlertService', () => {
  describe('getJobs', () => {
    const prisma = {
      jobs: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const service = new JobAlertService(prisma as any);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('scopes jobs to alerts owned by the authenticated user', async () => {
      prisma.jobs.count.mockResolvedValue(1);
      prisma.jobs.findMany.mockResolvedValue([
        {
          id: 'job-id',
          title: 'Backend Engineer',
          jobAlertId: 'alert-id',
        },
      ]);

      await service.getJobs({
        userId: 'user-id',
        alertId: 'alert-id',
        search: 'engineer',
        page: 2,
        perPage: 10,
      });

      const expectedWhere = {
        title: {
          contains: 'engineer',
          mode: 'insensitive',
        },
        jobAlertId: 'alert-id',
        jobAlert: {
          is: {
            userId: 'user-id',
          },
        },
      };

      expect(prisma.jobs.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
      expect(prisma.jobs.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
        skip: 10,
      });
    });

    it('does not fetch jobs when the scoped count is zero', async () => {
      prisma.jobs.count.mockResolvedValue(0);

      const result = await service.getJobs({
        userId: 'user-id',
        alertId: 'other-alert-id',
        page: 1,
        perPage: 10,
      });

      expect(prisma.jobs.findMany).not.toHaveBeenCalled();
      expect(result).toEqual({
        jobs: [],
        metadata: {
          page: 1,
          perPage: 10,
          total: 0,
          totalPages: 1,
        },
      });
    });
  });
});
