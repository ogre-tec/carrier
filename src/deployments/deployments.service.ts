import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deployment, DeploymentStatus } from './entities/deployment.entity';
import { EnvironmentsService } from '../environments/environments.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DeploymentsService {
  constructor(
    @InjectRepository(Deployment)
    private deploymentsRepository: Repository<Deployment>,
    private environmentsService: EnvironmentsService,
  ) {}

  async create(environmentId: string): Promise<Deployment> {
    const deployment = this.deploymentsRepository.create({
      environmentId,
      status: 'pending',
      logs: '',
    });

    return this.deploymentsRepository.save(deployment) as Promise<Deployment>;
  }

  async findAllByEnvironment(environmentId: string, user: User): Promise<Deployment[]> {
    // Verify user owns the environment
    await this.environmentsService.findOne(environmentId, user);

    return this.deploymentsRepository.find({
      where: { environmentId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async findOne(id: string): Promise<Deployment> {
    const deployment = await this.deploymentsRepository.findOne({
      where: { id },
      relations: ['environment', 'environment.application'],
    });

    if (!deployment) {
      throw new NotFoundException('Deployment not found');
    }

    return deployment;
  }

  async updateStatus(id: string, status: DeploymentStatus): Promise<Deployment> {
    const deployment = await this.findOne(id);
    deployment.status = status;

    if (status === 'building') {
      deployment.startedAt = new Date();
    }

    if (['running', 'stopped', 'failed'].includes(status)) {
      deployment.finishedAt = new Date();
    }

    return this.deploymentsRepository.save(deployment) as Promise<Deployment>;
  }

  async appendLog(id: string, message: string): Promise<void> {
    const deployment = await this.findOne(id);
    deployment.appendLog(message);
    await this.deploymentsRepository.save(deployment);
  }

  async getLogs(id: string, user: User): Promise<string> {
    const deployment = await this.findOne(id);
    // Verify user access through environment
    await this.environmentsService.findOne(deployment.environmentId, user);
    return deployment.logs || '';
  }
}
