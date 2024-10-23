import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransformationInterceptor } from 'src/app.interceptor';
import { JobAlertService } from './job_alert.service';
import { ResponseMessage } from 'src/app.decorator';
import { resMessage } from 'src/app.constants';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { CurrentUser } from 'src/types/user';
import { CreateJobAlertDto, EditJobAlertDto } from './dto';

@ApiBearerAuth()
@ApiTags('Job Alerts')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(TransformationInterceptor)
@Controller('job-alert')
export class JobAlertController {
  constructor(private readonly jobAlertService: JobAlertService) {}

  @Get()
  @ResponseMessage(resMessage('GET', 'job alerts'))
  getJobAlerts(@GetUser('id') userId: string) {
    return this.jobAlertService.getJobAlerts(userId);
  }

  @Get(':id')
  @ResponseMessage(resMessage('GET', 'job alert'))
  getSingleJobAlert(
    @GetUser('id') userId: string,
    @Param('id') alertId: string,
  ) {
    return this.jobAlertService.getSingleJobAlert(userId, alertId);
  }

  @Post()
  @ResponseMessage(resMessage('POST', 'job alert'))
  createJobAlert(@GetUser() user: CurrentUser, @Body() dto: CreateJobAlertDto) {
    return this.jobAlertService.createJobAlert(user, dto);
  }

  @Get(':id/jobs')
  @ResponseMessage(resMessage('GET', 'jobs'))
  getJobs(
    @Param('id') alertId: string,
    @Query('search') search: string,
    @Query('page', ParseIntPipe) page: number,
    @Query('perPage', ParseIntPipe) perPage: number,
  ) {
    return this.jobAlertService.getJobs({ alertId, search, page, perPage });
  }

  @Patch(':id')
  @ResponseMessage(resMessage('PATCH', 'job alert'))
  updateJobAlert(
    @GetUser('id') userId: string,
    @Param('id') alertId: string,
    @Body() dto: EditJobAlertDto,
  ) {
    return this.jobAlertService.updateJobAlert(userId, alertId, dto);
  }

  @Delete(':id')
  @ResponseMessage(resMessage('DELETE', 'job alert'))
  deleteJobAlert(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.jobAlertService.deleteJobAlert(id, userId);
  }
}
