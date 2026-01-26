import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { DeploymentRunnerService } from './deployment-runner.service';
import { User } from '../users/entities/user.entity';
import { Deployment } from './entities/deployment.entity';

describe('DeploymentsController', () => {
  let controller: DeploymentsController;
  let mockDeploymentsService: {
    findAllByEnvironment: ReturnType<typeof vi.fn>;
    getLogs: ReturnType<typeof vi.fn>;
  };
  let mockDeploymentRunnerService: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    restart: ReturnType<typeof vi.fn>;
  };

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedpassword',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDeployment: Partial<Deployment> = {
    id: 'deployment-123',
    environmentId: 'env-123',
    status: 'running',
    logs: 'Some logs',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockDeploymentsService = {
      findAllByEnvironment: vi.fn(),
      getLogs: vi.fn(),
    };

    mockDeploymentRunnerService = {
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeploymentsController],
      providers: [
        {
          provide: DeploymentsService,
          useValue: mockDeploymentsService,
        },
        {
          provide: DeploymentRunnerService,
          useValue: mockDeploymentRunnerService,
        },
      ],
    }).compile();

    controller = module.get<DeploymentsController>(DeploymentsController);
  });

  describe('findAll', () => {
    it('should return deployments for an environment', async () => {
      const environmentId = 'env-123';
      const deployments = [mockDeployment];
      mockDeploymentsService.findAllByEnvironment.mockResolvedValue(deployments);

      const result = await controller.findAll(environmentId, mockUser);

      expect(mockDeploymentsService.findAllByEnvironment).toHaveBeenCalledWith(environmentId, mockUser);
      expect(result).toEqual(deployments);
    });
  });

  describe('getLogs', () => {
    it('should return logs for a deployment', async () => {
      const deploymentId = 'deployment-123';
      const logs = 'Log line 1\nLog line 2';
      mockDeploymentsService.getLogs.mockResolvedValue(logs);

      const result = await controller.getLogs(deploymentId, mockUser);

      expect(mockDeploymentsService.getLogs).toHaveBeenCalledWith(deploymentId, mockUser);
      expect(result).toBe(logs);
    });
  });

  describe('start', () => {
    it('should start an environment', async () => {
      const environmentId = 'env-123';
      const startResult = { deploymentId: 'deployment-123', port: 4000 };
      mockDeploymentRunnerService.start.mockResolvedValue(startResult);

      const result = await controller.start(environmentId, mockUser);

      expect(mockDeploymentRunnerService.start).toHaveBeenCalledWith(environmentId, mockUser);
      expect(result).toEqual(startResult);
    });
  });

  describe('stop', () => {
    it('should stop an environment', async () => {
      const environmentId = 'env-123';
      mockDeploymentRunnerService.stop.mockResolvedValue(undefined);

      await controller.stop(environmentId, mockUser);

      expect(mockDeploymentRunnerService.stop).toHaveBeenCalledWith(environmentId, mockUser);
    });
  });

  describe('restart', () => {
    it('should restart an environment', async () => {
      const environmentId = 'env-123';
      const restartResult = { deploymentId: 'deployment-456', port: 4001 };
      mockDeploymentRunnerService.restart.mockResolvedValue(restartResult);

      const result = await controller.restart(environmentId, mockUser);

      expect(mockDeploymentRunnerService.restart).toHaveBeenCalledWith(environmentId, mockUser);
      expect(result).toEqual(restartResult);
    });
  });

  describe('getEnvironmentLogs', () => {
    it('should return deployments for an environment (same as findAll)', async () => {
      const environmentId = 'env-123';
      const deployments = [mockDeployment];
      mockDeploymentsService.findAllByEnvironment.mockResolvedValue(deployments);

      const result = await controller.getEnvironmentLogs(environmentId, mockUser);

      expect(mockDeploymentsService.findAllByEnvironment).toHaveBeenCalledWith(environmentId, mockUser);
      expect(result).toEqual(deployments);
    });
  });
});
