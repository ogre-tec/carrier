import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusService } from './status.service';
import { StatusController } from './status.controller';
import { Application } from '../applications/entities/application.entity';
import { Environment } from '../environments/entities/environment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Application, Environment])],
  providers: [StatusService],
  controllers: [StatusController],
})
export class StatusModule {}
