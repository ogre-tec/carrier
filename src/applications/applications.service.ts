import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './entities/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private applicationsRepository: Repository<Application>,
  ) {}

  async create(createApplicationDto: CreateApplicationDto, user: User): Promise<Application> {
    const application = this.applicationsRepository.create({
      ...createApplicationDto,
      userId: user.id,
    });

    return this.applicationsRepository.save(application) as Promise<Application>;
  }

  async findAllByUser(user: User): Promise<Application[]> {
    return this.applicationsRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Application> {
    const application = await this.applicationsRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.userId !== user.id) {
      throw new ForbiddenException('You do not have access to this application');
    }

    return application;
  }

  async update(id: string, updateApplicationDto: UpdateApplicationDto, user: User): Promise<Application> {
    const application = await this.findOne(id, user);

    Object.assign(application, updateApplicationDto);

    return this.applicationsRepository.save(application) as Promise<Application>;
  }

  async remove(id: string, user: User): Promise<void> {
    const application = await this.findOne(id, user);
    await this.applicationsRepository.remove(application);
  }
}
