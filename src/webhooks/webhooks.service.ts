import { Injectable, NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { Webhook } from './entities/webhook.entity';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { ApplicationsService } from '../applications/applications.service';
import { EnvironmentsService } from '../environments/environments.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Webhook)
    private webhooksRepository: Repository<Webhook>,
    private applicationsService: ApplicationsService,
    private environmentsService: EnvironmentsService,
  ) {}

  async create(createWebhookDto: CreateWebhookDto, user: User): Promise<Webhook> {
    // Verify user owns the application and environment
    await this.applicationsService.findOne(createWebhookDto.applicationId, user);
    await this.environmentsService.findOne(createWebhookDto.environmentId, user);

    const secret = randomBytes(32).toString('hex');

    const webhook = this.webhooksRepository.create({
      applicationId: createWebhookDto.applicationId,
      environmentId: createWebhookDto.environmentId,
      secret,
    });

    return this.webhooksRepository.save(webhook) as Promise<Webhook>;
  }

  async findAllByApplication(applicationId: string, user: User): Promise<Webhook[]> {
    // Verify user owns the application
    await this.applicationsService.findOne(applicationId, user);

    return this.webhooksRepository.find({
      where: { applicationId },
      relations: ['environment'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Webhook> {
    const webhook = await this.webhooksRepository.findOne({
      where: { id },
      relations: ['application', 'environment'],
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    // Verify user owns the application
    await this.applicationsService.findOne(webhook.applicationId, user);

    return webhook;
  }

  async remove(id: string, user: User): Promise<void> {
    const webhook = await this.findOne(id, user);
    await this.webhooksRepository.remove(webhook);
  }

  async regenerateSecret(id: string, user: User): Promise<Webhook> {
    const webhook = await this.findOne(id, user);
    webhook.secret = randomBytes(32).toString('hex');
    return this.webhooksRepository.save(webhook) as Promise<Webhook>;
  }

  async toggleActive(id: string, user: User): Promise<Webhook> {
    const webhook = await this.findOne(id, user);
    webhook.active = !webhook.active;
    return this.webhooksRepository.save(webhook) as Promise<Webhook>;
  }

  async validateAndTrigger(id: string, signature: string, payload: string): Promise<{ environmentId: string }> {
    const webhook = await this.webhooksRepository.findOne({
      where: { id },
      relations: ['environment'],
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    if (!webhook.active) {
      throw new ForbiddenException('Webhook is not active');
    }

    // Validate signature (HMAC SHA-256)
    const expectedSignature = createHmac('sha256', webhook.secret)
      .update(payload)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return { environmentId: webhook.environmentId };
  }
}
