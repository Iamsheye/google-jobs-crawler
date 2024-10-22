import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CurrentUser } from 'src/types/user';
import { CreateJobAlertDto, EditJobAlertDto } from './dto';

type GetJobsArgs = {
  alertId: string;
  page: number;
  perPage: number;
};

@Injectable()
export class JobAlertService {
  constructor(private prisma: PrismaService) {}

  async getJobAlerts(userId: string) {
    const jobAlerts = await this.prisma.jobAlerts.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        jobs: {
          take: 3,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return jobAlerts;
  }

  async getSingleJobAlert(userId: string, alertId: string) {
    const jobAlert = await this.prisma.jobAlerts.findFirst({
      where: {
        id: alertId,
        userId,
      },
      include: {
        jobs: {
          take: 3,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!jobAlert || jobAlert.userId !== userId) {
      throw new NotFoundException(
        `Unable to access job alert with id ${alertId}`,
      );
    }

    return jobAlert;
  }

  async createJobAlert(user: CurrentUser, dto: CreateJobAlertDto) {
    try {
      const jobAlertsCount = await this.prisma.jobAlerts.count({
        where: {
          userId: user.id,
        },
      });

      if (jobAlertsCount >= 3) {
        throw new ForbiddenException(`You can only create 3 job alerts`);
      }

      if (user.isPremium === false && jobAlertsCount >= 1) {
        throw new ForbiddenException(
          `Upgrade to premium to create more job alerts`,
        );
      }

      const jobAlert = await this.prisma.jobAlerts.create({
        data: {
          ...dto,
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      });

      return jobAlert;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new NotFoundException(`User with ${user.id} does not exist`);
        }
      }

      throw e;
    }
  }

  async getJobs({ alertId, page, perPage }: GetJobsArgs) {
    // get total number of jobs
    const totalJobs = await this.prisma.jobs.count({
      where: {
        jobAlertId: alertId,
      },
    });

    console.log(totalJobs);

    if (totalJobs === 0) {
      return {
        jobs: [],
        metadata: {
          page,
          perPage,
          total: totalJobs,
          totalPages: 1,
        },
      };
    }

    const jobs = await this.prisma.jobs.findMany({
      where: {
        jobAlertId: alertId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: perPage,
      skip: (page - 1) * perPage,
    });

    return {
      jobs,
      metadata: {
        page,
        perPage,
        total: totalJobs,
        totalPages: Math.ceil(totalJobs / perPage),
      },
    };
  }

  async updateJobAlert(userId: string, alertId: string, dto: EditJobAlertDto) {
    const jobAlert = await this.prisma.jobAlerts.findFirst({
      where: {
        id: alertId,
        userId,
      },
    });

    if (!jobAlert || jobAlert.userId !== userId) {
      throw new NotFoundException(
        `Unable to access job alert with id ${userId}`,
      );
    }

    const updatedJobAlert = await this.prisma.jobAlerts.update({
      where: {
        id: alertId,
      },
      data: {
        ...dto,
      },
    });

    return updatedJobAlert;
  }

  async deleteJobAlert(id: string, userId: string) {
    const jobAlert = await this.prisma.jobAlerts.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!jobAlert || jobAlert.userId !== userId) {
      throw new NotFoundException(`Unable to access job alert with id ${id}`);
    }

    await this.prisma.jobAlerts.delete({
      where: {
        id,
      },
    });

    return;
  }
}
