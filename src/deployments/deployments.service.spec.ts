import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DeploymentsService } from './deployments.service';
import { Deployment } from './entities/deployment.entity';
import { EnvironmentsService } from '../environments/environments.service';
import { User } from '../users/entities/user.entity';

describe('DeploymentsService', () => {
  let service: DeploymentsService;
  let mockRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };
  let mockEnvironmentsService: {
    findOne: ReturnType<typeof vi.fn>;
  };

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedpassword',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDeployment: Deployment = {
    id: 'deployment-123',
    environmentId: 'env-123',
    status: 'pending',
    logs: '',
    startedAt: null,
    finishedAt: null,
    createdAt: new Date(),
    environment: null as any,
    appendLog: vi.fn(),
  };

  beforeEach(async () => {
    mockRepository = {
      create: vi.fn(),
      save: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
    };

    mockEnvironmentsService = {
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        {
          provide: getRepositoryToken(Deployment),
          useValue: mockRepository,
        },
        {
          provide: EnvironmentsService,
          useValue: mockEnvironmentsService,
        },
      ],
    }).compile();

    service = module.get<DeploymentsService>(DeploymentsService);
  });

  describe('create', () => {
    it('should create a new deployment with pending status', async () => {
      const environmentId = 'env-123';
      const createdDeployment = { ...mockDeployment, environmentId };

      mockRepository.create.mockReturnValue(createdDeployment);
      mockRepository.save.mockResolvedValue(createdDeployment);

      const result = await service.create(environmentId);

      expect(mockRepository.create).toHaveBeenCalledWith({
        environmentId,
        status: 'pending',
        logs: '',
      });
      expect(mockRepository.save).toHaveBeenCalledWith(createdDeployment);
      expect(result).toEqual(createdDeployment);
    });
  });

  describe('findAllByEnvironment', () => {
    it('should return deployments for an environment', async () => {
      const environmentId = 'env-123';
      const deployments = [mockDeployment, { ...mockDeployment, id: 'deployment-456' }];

      mockEnvironmentsService.findOne.mockResolvedValue({ id: environmentId });
      mockRepository.find.mockResolvedValue(deployments);

      const result = await service.findAllByEnvironment(environmentId, mockUser);

      expect(mockEnvironmentsService.findOne).toHaveBeenCalledWith(environmentId, mockUser);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { environmentId },
        order: { createdAt: 'DESC' },
        take: 50,
      });
      expect(result).toEqual(deployments);
    });

    it('should throw if user does not own the environment', async () => {
      const environmentId = 'env-123';
      mockEnvironmentsService.findOne.mockRejectedValue(new NotFoundException('Environment not found'));

      await expect(service.findAllByEnvironment(environmentId, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a deployment by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockDeployment);

      const result = await service.findOne('deployment-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'deployment-123' },
        relations: ['environment', 'environment.application'],
      });
      expect(result).toEqual(mockDeployment);
    });

    it('should throw NotFoundException if deployment not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow('Deployment not found');
    });
  });

  describe('updateStatus', () => {
    it('should update deployment status', async () => {
      const deployment = { ...mockDeployment, status: 'pending' as const };
      mockRepository.findOne.mockResolvedValue(deployment);
      mockRepository.save.mockResolvedValue({ ...deployment, status: 'running' });

      const result = await service.updateStatus('deployment-123', 'running');

      expect(result.status).toBe('running');
    });

    it('should set startedAt when status is building', async () => {
      const deployment = { ...mockDeployment, startedAt: null };
      mockRepository.findOne.mockResolvedValue(deployment);
      mockRepository.save.mockImplementation((d) => Promise.resolve(d));

      await service.updateStatus('deployment-123', 'building');

      expect(deployment.startedAt).toBeInstanceOf(Date);
    });

    it('should set finishedAt when status is running', async () => {
      const deployment = { ...mockDeployment, finishedAt: null };
      mockRepository.findOne.mockResolvedValue(deployment);
      mockRepository.save.mockImplementation((d) => Promise.resolve(d));

      await service.updateStatus('deployment-123', 'running');

      expect(deployment.finishedAt).toBeInstanceOf(Date);
    });

    it('should set finishedAt when status is stopped', async () => {
      const deployment = { ...mockDeployment, finishedAt: null };
      mockRepository.findOne.mockResolvedValue(deployment);
      mockRepository.save.mockImplementation((d) => Promise.resolve(d));

      await service.updateStatus('deployment-123', 'stopped');

      expect(deployment.finishedAt).toBeInstanceOf(Date);
    });

    it('should set finishedAt when status is failed', async () => {
      const deployment = { ...mockDeployment, finishedAt: null };
      mockRepository.findOne.mockResolvedValue(deployment);
      mockRepository.save.mockImplementation((d) => Promise.resolve(d));

      await service.updateStatus('deployment-123', 'failed');

      expect(deployment.finishedAt).toBeInstanceOf(Date);
    });

    it('should not set finishedAt when status is pending', async () => {
      const deployment = { ...mockDeployment, finishedAt: null };
      mockRepository.findOne.mockResolvedValue(deployment);
      mockRepository.save.mockImplementation((d) => Promise.resolve(d));

      await service.updateStatus('deployment-123', 'pending');

      expect(deployment.finishedAt).toBeNull();
    });
  });

  describe('appendLog', () => {
    it('should append a log message to the deployment', async () => {
      const deployment = {
        ...mockDeployment,
        logs: '',
        appendLog: vi.fn(),
      };
      mockRepository.findOne.mockResolvedValue(deployment);
      mockRepository.save.mockResolvedValue(deployment);

      await service.appendLog('deployment-123', 'Test log message');

      expect(deployment.appendLog).toHaveBeenCalledWith('Test log message');
      expect(mockRepository.save).toHaveBeenCalledWith(deployment);
    });
  });

  describe('getLogs', () => {
    it('should return logs for a deployment', async () => {
      const deployment = { ...mockDeployment, logs: 'Log line 1\nLog line 2\n' };
      mockRepository.findOne.mockResolvedValue(deployment);
      mockEnvironmentsService.findOne.mockResolvedValue({ id: 'env-123' });

      const result = await service.getLogs('deployment-123', mockUser);

      expect(result).toBe('Log line 1\nLog line 2\n');
    });

    it('should return empty string if logs are null', async () => {
      const deployment = { ...mockDeployment, logs: null };
      mockRepository.findOne.mockResolvedValue(deployment);
      mockEnvironmentsService.findOne.mockResolvedValue({ id: 'env-123' });

      const result = await service.getLogs('deployment-123', mockUser);

      expect(result).toBe('');
    });

    it('should verify user access through environment', async () => {
      const deployment = { ...mockDeployment, environmentId: 'env-123' };
      mockRepository.findOne.mockResolvedValue(deployment);
      mockEnvironmentsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.getLogs('deployment-123', mockUser)).rejects.toThrow(NotFoundException);
      expect(mockEnvironmentsService.findOne).toHaveBeenCalledWith('env-123', mockUser);
    });
  });
});
