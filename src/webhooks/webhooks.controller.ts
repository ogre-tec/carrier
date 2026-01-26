import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Query,
  Headers,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('api/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createWebhookDto: CreateWebhookDto,
    @CurrentUser() user: User,
  ) {
    return this.webhooksService.create(createWebhookDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser() user: User,
  ) {
    return this.webhooksService.findAllByApplication(applicationId, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.webhooksService.findOne(id, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.webhooksService.remove(id, user);
  }

  @Post(':id/regenerate')
  @UseGuards(JwtAuthGuard)
  regenerateSecret(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.webhooksService.regenerateSecret(id, user);
  }

  @Post(':id/toggle')
  @UseGuards(JwtAuthGuard)
  toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.webhooksService.toggleActive(id, user);
  }

  @Public()
  @Post(':id/trigger')
  async trigger(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-webhook-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const payload = req.rawBody?.toString() || '';
    const result = await this.webhooksService.validateAndTrigger(id, signature, payload);
    return { message: 'Webhook triggered', environmentId: result.environmentId };
  }
}
