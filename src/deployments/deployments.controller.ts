import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { DeploymentsService } from './deployments.service';
import { DeploymentRunnerService } from './deployment-runner.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class DeploymentsController {
  constructor(
    private readonly deploymentsService: DeploymentsService,
    private readonly deploymentRunnerService: DeploymentRunnerService,
  ) {}

  @Get('deployments')
  findAll(
    @Query('environmentId', ParseUUIDPipe) environmentId: string,
    @CurrentUser() user: User,
  ) {
    return this.deploymentsService.findAllByEnvironment(environmentId, user);
  }

  @Get('deployments/:id/logs')
  getLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.deploymentsService.getLogs(id, user);
  }

  @Post('environments/:id/start')
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.deploymentRunnerService.start(id, user);
  }

  @Post('environments/:id/stop')
  stop(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.deploymentRunnerService.stop(id, user);
  }

  @Post('environments/:id/restart')
  restart(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.deploymentRunnerService.restart(id, user);
  }

  @Get('environments/:id/logs')
  getEnvironmentLogs(
    @Param('id', ParseUUIDPipe) environmentId: string,
    @CurrentUser() user: User,
  ) {
    return this.deploymentsService.findAllByEnvironment(environmentId, user);
  }
}
