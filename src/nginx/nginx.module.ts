import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NginxService } from './nginx.service';
import { NginxController } from './nginx.controller';
import { Application } from '../applications/entities/application.entity';
import { Environment } from '../environments/entities/environment.entity';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Application, Environment])],
  providers: [NginxService, RolesGuard],
  controllers: [NginxController],
})
export class NginxModule {}
