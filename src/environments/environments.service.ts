import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Environment } from './entities/environment.entity';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { ApplicationsService } from '../applications/applications.service';
import { CryptoService } from '../crypto/crypto.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class EnvironmentsService {
  constructor(
    @InjectRepository(Environment)
    private environmentsRepository: Repository<Environment>,
    private applicationsService: ApplicationsService,
    private cryptoService: CryptoService,
  ) {}

  async create(createEnvironmentDto: CreateEnvironmentDto, user: User): Promise<Environment> {
    // Verify user owns the application
    await this.applicationsService.findOne(createEnvironmentDto.applicationId, user);

    const encryptedVariables = this.cryptoService.encryptData(createEnvironmentDto.variables || {});

    const environment = this.environmentsRepository.create({
      name: createEnvironmentDto.name,
      applicationId: createEnvironmentDto.applicationId,
      variables: encryptedVariables,
    });

    return this.environmentsRepository.save(environment);
  }

  async findAllByApplication(applicationId: string, user: User): Promise<Environment[]> {
    // Verify user owns the application
    await this.applicationsService.findOne(applicationId, user);

    const envs = await this.environmentsRepository.find({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });

    if (envs.length > 0) {
      return envs.map(env => {
        env.variables = JSON.stringify(
          this.cryptoService.decryptData(env.variables)
        );
        return env;
      })
    }

    return [];
  }

  async findOne(id: string, user: User): Promise<Environment> {
    const environment = await this.environmentsRepository.findOne({
      where: { id },
      relations: ['application'],
    });

    if (!environment) {
      throw new NotFoundException('Environment not found');
    }

    // Verify user owns the application
    await this.applicationsService.findOne(environment.applicationId, user);

    return environment;
  }

  async update(id: string, updateEnvironmentDto: UpdateEnvironmentDto, user: User): Promise<Environment> {
    const environment = await this.findOne(id, user);

    if (updateEnvironmentDto.name) {
      environment.name = updateEnvironmentDto.name;
    }

    if (updateEnvironmentDto.variables) {
      environment.setEncryptedVariables(
        updateEnvironmentDto.variables,
        (data) => this.cryptoService.encryptData(data),
      );
    }

    return this.environmentsRepository.save(environment) as Promise<Environment>;
  }

  async remove(id: string, user: User): Promise<void> {
    const environment = await this.findOne(id, user);

    if (environment.status === 'running') {
      throw new BadRequestException('Cannot delete a running environment. Stop it first.');
    }

    await this.environmentsRepository.remove(environment);
  }

  async updateStatus(id: string, status: Environment['status'], port?: number | null, pid?: number | null): Promise<Environment> {
    const environment = await this.environmentsRepository.findOne({ where: { id } });

    if (!environment) {
      throw new NotFoundException('Environment not found');
    }

    environment.status = status;
    if (port !== undefined) {
      environment.port = port;
    }
    if (pid !== undefined) {
      environment.pid = pid;
    }

    return this.environmentsRepository.save(environment) as Promise<Environment>;
  }

  getDecryptedVariables(environment: Environment): Record<string, string> {
    return environment.getDecryptedVariables((data) => this.cryptoService.decryptData(data));
  }
}
