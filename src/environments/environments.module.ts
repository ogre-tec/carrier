import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Environment } from './entities/environment.entity';
import { EnvironmentsService } from './environments.service';
import { EnvironmentsController } from './environments.controller';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Environment]),
    ApplicationsModule,
  ],
  controllers: [EnvironmentsController],
  providers: [EnvironmentsService],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
