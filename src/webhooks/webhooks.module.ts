import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhook } from './entities/webhook.entity';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { ApplicationsModule } from '../applications/applications.module';
import { EnvironmentsModule } from '../environments/environments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook]),
    ApplicationsModule,
    EnvironmentsModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
