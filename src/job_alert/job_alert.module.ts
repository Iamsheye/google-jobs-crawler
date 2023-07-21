import { Module } from '@nestjs/common';
import { JobAlertService } from './job_alert.service';
import { JobAlertController } from './job_alert.controller';

@Module({
  providers: [JobAlertService],
  controllers: [JobAlertController],
})
export class JobAlertModule {}
