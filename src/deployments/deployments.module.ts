import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deployment } from './entities/deployment.entity';
import { DeploymentsService } from './deployments.service';
import { DeploymentRunnerService } from './deployment-runner.service';
import { DeploymentsController } from './deployments.controller';
import { EnvironmentsModule } from '../environments/environments.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Deployment]),
    EnvironmentsModule,
    ApplicationsModule,
  ],
  controllers: [DeploymentsController],
  providers: [DeploymentsService, DeploymentRunnerService],
  exports: [DeploymentsService, DeploymentRunnerService],
})
export class DeploymentsModule {}
