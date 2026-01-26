import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { DeploymentRunnerService } from './deployment-runner.service';
import { DeploymentsService } from './deployments.service';
import { EnvironmentsService } from '../environments/environments.service';
import { ApplicationsService } from '../applications/applications.service';
import { User } from '../users/entities/user.entity';
import { Environment } from '../environments/entities/environment.entity';
import { Application } from '../applications/entities/application.entity';
import { EventEmitter } from 'events';
import * as childProcess from 'child_process';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs
vi.mock('fs', () => ({
  mkdirSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
}));

describe('DeploymentRunnerService', () => {
  let service: DeploymentRunnerService;
  let mockDeploymentsService: {
    create: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
    appendLog: ReturnType<typeof vi.fn>;
  };
  let mockEnvironmentsService: {
    findOne: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
    getDecryptedVariables: ReturnType<typeof vi.fn>;
  };
  let mockApplicationsService: {
    findOne: ReturnType<typeof vi.fn>;
  };

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedpassword',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    providerId: null,
    provider: 'email'
  };

  const mockApplication: Partial<Application> = {
    id: 'app-123',
    name: 'Test App',
    startCommand: 'npm start',
    buildCommand: null,
    repositoryUrl: null,
  };

  const mockEnvironment: Partial<Environment> = {
    id: 'env-123',
    name: 'production',
    applicationId: 'app-123',
    status: 'stopped',
    variables: '{}',
  };

  function createMockChildProcess() {
    const mockProcess = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      pid: number;
      kill: ReturnType<typeof vi.fn>;
    };
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.pid = 12345;
    mockProcess.kill = vi.fn();
    return mockProcess;
  }

  beforeEach(async () => {
    vi.clearAllMocks();

    mockDeploymentsService = {
      create: vi.fn().mockResolvedValue({ id: 'deployment-123' }),
      updateStatus: vi.fn().mockResolvedValue({}),
      appendLog: vi.fn().mockResolvedValue(undefined),
    };

    mockEnvironmentsService = {
      findOne: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue({}),
      getDecryptedVariables: vi.fn().mockReturnValue({}),
    };

    mockApplicationsService = {
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentRunnerService,
        {
          provide: DeploymentsService,
          useValue: mockDeploymentsService,
        },
        {
          provide: EnvironmentsService,
          useValue: mockEnvironmentsService,
        },
        {
          provide: ApplicationsService,
          useValue: mockApplicationsService,
        },
      ],
    }).compile();

    service = module.get<DeploymentRunnerService>(DeploymentRunnerService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should throw if environment is already running', async () => {
      mockEnvironmentsService.findOne.mockResolvedValue({ ...mockEnvironment, status: 'running' });

      await expect(service.start('env-123', mockUser)).rejects.toThrow(BadRequestException);
      await expect(service.start('env-123', mockUser)).rejects.toThrow('Environment is already running');
    });

    it('should throw if application has no start command', async () => {
      mockEnvironmentsService.findOne.mockResolvedValue({ ...mockEnvironment, status: 'stopped' });
      mockApplicationsService.findOne.mockResolvedValue({ ...mockApplication, startCommand: null });

      await expect(service.start('env-123', mockUser)).rejects.toThrow(BadRequestException);
      await expect(service.start('env-123', mockUser)).rejects.toThrow('Application has no start command configured');
    });

    it('should create a deployment and start the process', async () => {
      const mockProcess = createMockChildProcess();
      vi.mocked(childProcess.spawn).mockReturnValue(mockProcess as any);

      mockEnvironmentsService.findOne.mockResolvedValue({ ...mockEnvironment, status: 'stopped' });
      mockApplicationsService.findOne.mockResolvedValue(mockApplication);
      mockEnvironmentsService.getDecryptedVariables.mockReturnValue({ PORT: '3000' });

      const result = await service.start('env-123', mockUser);

      expect(mockDeploymentsService.create).toHaveBeenCalledWith('env-123');
      expect(mockDeploymentsService.updateStatus).toHaveBeenCalledWith('deployment-123', 'building');
      expect(result).toHaveProperty('deploymentId', 'deployment-123');
      expect(result).toHaveProperty('port');
    });

    it('should use PORT from environment variables if provided', async () => {
      const mockProcess = createMockChildProcess();
      vi.mocked(childProcess.spawn).mockReturnValue(mockProcess as any);

      mockEnvironmentsService.findOne.mockResolvedValue({ ...mockEnvironment, status: 'stopped' });
      mockApplicationsService.findOne.mockResolvedValue(mockApplication);
      mockEnvironmentsService.getDecryptedVariables.mockReturnValue({ PORT: '5000' });

      const result = await service.start('env-123', mockUser);

      expect(result.port).toBe(5000);
    });

    it('should run build command if provided', async () => {
      const mockProcess = createMockChildProcess();
      const buildProcess = createMockChildProcess();

      vi.mocked(childProcess.spawn)
        .mockReturnValueOnce(buildProcess as any)
        .mockReturnValue(mockProcess as any);

      mockEnvironmentsService.findOne.mockResolvedValue({ ...mockEnvironment, status: 'stopped' });
      mockApplicationsService.findOne.mockResolvedValue({
        ...mockApplication,
        buildCommand: 'npm run build',
      });

      // Simulate successful build completion
      setTimeout(() => {
        buildProcess.emit('exit', 0);
      }, 10);

      const resultPromise = service.start('env-123', mockUser);

      await expect(resultPromise).resolves.toHaveProperty('deploymentId');
      expect(mockDeploymentsService.appendLog).toHaveBeenCalledWith(
        'deployment-123',
        expect.stringContaining('Running build command'),
      );
    });

    it('should clone repository if repositoryUrl is provided', async () => {
      const mockProcess = createMockChildProcess();
      const rmProcess = createMockChildProcess();
      const cloneProcess = createMockChildProcess();

      vi.mocked(childProcess.spawn)
        .mockReturnValueOnce(rmProcess as any)
        .mockReturnValueOnce(cloneProcess as any)
        .mockReturnValue(mockProcess as any);

      mockEnvironmentsService.findOne.mockResolvedValue({ ...mockEnvironment, status: 'stopped' });
      mockApplicationsService.findOne.mockResolvedValue({
        ...mockApplication,
        repositoryUrl: 'https://github.com/test/repo.git',
      });

      // Simulate successful clone completion
      setTimeout(() => {
        rmProcess.emit('exit', 0);
      }, 5);
      setTimeout(() => {
        cloneProcess.emit('exit', 0);
      }, 10);

      const resultPromise = service.start('env-123', mockUser);

      await expect(resultPromise).resolves.toHaveProperty('deploymentId');
      expect(mockDeploymentsService.appendLog).toHaveBeenCalledWith(
        'deployment-123',
        expect.stringContaining('Clonning repository'),
      );
    });
  });

  describe('stop', () => {
    it('should throw if environment is not running', async () => {
      mockEnvironmentsService.findOne.mockResolvedValue({ ...mockEnvironment, status: 'stopped' });

      await expect(service.stop('env-123', mockUser)).rejects.toThrow(BadRequestException);
      await expect(service.stop('env-123', mockUser)).rejects.toThrow('Environment is not running');
    });

    it('should stop a running environment', async () => {
      // First start an environment
      const mockProcess = createMockChildProcess();
      vi.mocked(childProcess.spawn).mockReturnValue(mockProcess as any);

      mockEnvironmentsService.findOne
        .mockResolvedValueOnce({ ...mockEnvironment, status: 'stopped' })
        .mockResolvedValueOnce({ ...mockEnvironment, status: 'running' });
      mockApplicationsService.findOne.mockResolvedValue(mockApplication);

      await service.start('env-123', mockUser);

      // Now stop it
      await service.stop('env-123', mockUser);

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockEnvironmentsService.updateStatus).toHaveBeenCalledWith('env-123', 'stopped', null, null);
    });
  });

  describe('restart', () => {
    it('should stop and start the environment', async () => {
      // First, start an environment to have it in running state
      const initialProcess = createMockChildProcess();
      vi.mocked(childProcess.spawn).mockReturnValue(initialProcess as any);

      mockEnvironmentsService.findOne.mockResolvedValueOnce({ ...mockEnvironment, status: 'stopped' });
      mockApplicationsService.findOne.mockResolvedValue(mockApplication);

      await service.start('env-123', mockUser);

      // Now setup mocks for restart sequence:
      // 1. stop() calls findOne expecting 'running'
      // 2. start() calls findOne expecting 'stopped'
      const restartProcess = createMockChildProcess();
      vi.mocked(childProcess.spawn).mockReturnValue(restartProcess as any);

      mockEnvironmentsService.findOne
        .mockResolvedValueOnce({ ...mockEnvironment, status: 'running' }) // for stop
        .mockResolvedValueOnce({ ...mockEnvironment, status: 'stopped' }); // for start

      const result = await service.restart('env-123', mockUser);

      expect(initialProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(result).toHaveProperty('deploymentId');
      expect(result).toHaveProperty('port');
    });

    it('should handle restart when environment is not running', async () => {
      const mockProcess = createMockChildProcess();
      vi.mocked(childProcess.spawn).mockReturnValue(mockProcess as any);

      // First call to stop will fail (not running), then start should work
      mockEnvironmentsService.findOne
        .mockResolvedValueOnce({ ...mockEnvironment, status: 'stopped' })
        .mockResolvedValueOnce({ ...mockEnvironment, status: 'stopped' });
      mockApplicationsService.findOne.mockResolvedValue(mockApplication);

      const result = await service.restart('env-123', mockUser);

      expect(result).toHaveProperty('deploymentId');
    });
  });

  describe('process events', () => {
    it('should log stdout data', async () => {
      const mockProcess = createMockChildProcess();
      vi.mocked(childProcess.spawn).mockReturnValue(mockProcess as any);

      mockEnvironmentsService.findOne.mockResolvedValue({ ...mockEnvironment, status: 'stopped' });
      mockApplicationsService.findOne.mockResolvedValue(mockApplication);

      await service.start('env-123', mockUser);

      // Emit stdout data
      mockProcess.stdout.emit('data', Buffer.from('Hello from stdout'));

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockDeploymentsService.appendLog).toHaveBeenCalledWith('deployment-123', '[stdout] Hello from stdout');
    });

    it('should log stderr data', async () => {
      const mockProcess = createMockChildProcess();
      vi.mocked(childProcess.spawn).mockReturnValue(mockProcess as any);

      mockEnvironmentsService.findOne.mockResolvedValue({ ...mockEnvironment, status: 'stopped' });
      mockApplicationsService.findOne.mockResolvedValue(mockApplication);

      await service.start('env-123', mockUser);

      // Emit stderr data
      mockProcess.stderr.emit('data', Buffer.from('Error message'));

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockDeploymentsService.appendLog).toHaveBeenCalledWith('deployment-123', '[stderr] Error message');
    });

    it('should handle process close with exit code 0', async () => {
      const mockProcess = createMockChildProcess();
      vi.mocked(childProcess.spawn).mockReturnValue(mockProcess as any);

      mockEnvironmentsService.findOne.mockResolvedValue({ ...mockEnvironment, status: 'stopped' });
      mockApplicationsService.findOne.mockResolvedValue(mockApplication);

      await service.start('env-123', mockUser);

      // Emit close event with code 0
      mockProcess.emit('close', 0, null);

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockDeploymentsService.appendLog).toHaveBeenCalledWith('deployment-123', 'Process exited with code 0');
      expect(mockDeploymentsService.updateStatus).toHaveBeenCalledWith('deployment-123', 'stopped');
      expect(mockEnvironmentsService.updateStatus).toHaveBeenCalledWith('env-123', 'stopped', null, null);
    });

    it('should handle process close with non-zero exit code', async () => {
      const mockProcess = createMockChildProcess();
      vi.mocked(childProcess.spawn).mockReturnValue(mockProcess as any);

      mockEnvironmentsService.findOne.mockResolvedValue({ ...mockEnvironment, status: 'stopped' });
      mockApplicationsService.findOne.mockResolvedValue(mockApplication);

      await service.start('env-123', mockUser);

      // Emit close event with code 1
      mockProcess.emit('close', 1, null);

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockDeploymentsService.appendLog).toHaveBeenCalledWith('deployment-123', 'Process exited with code 1');
      expect(mockDeploymentsService.updateStatus).toHaveBeenCalledWith('deployment-123', 'failed');
      expect(mockEnvironmentsService.updateStatus).toHaveBeenCalledWith('env-123', 'error', null, null);
    });

    it('should handle process close with SIGTERM signal', async () => {
      const mockProcess = createMockChildProcess();
      vi.mocked(childProcess.spawn).mockReturnValue(mockProcess as any);

      mockEnvironmentsService.findOne.mockResolvedValue({ ...mockEnvironment, status: 'stopped' });
      mockApplicationsService.findOne.mockResolvedValue(mockApplication);

      await service.start('env-123', mockUser);

      // Emit close event with SIGTERM signal
      mockProcess.emit('close', null, 'SIGTERM');

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockDeploymentsService.appendLog).toHaveBeenCalledWith(
        'deployment-123',
        'Process exited with signal SIGTERM',
      );
      expect(mockDeploymentsService.updateStatus).toHaveBeenCalledWith('deployment-123', 'stopped');
      expect(mockEnvironmentsService.updateStatus).toHaveBeenCalledWith('env-123', 'stopped', null, null);
    });

    it('should handle process close with other signal', async () => {
      const mockProcess = createMockChildProcess();
      vi.mocked(childProcess.spawn).mockReturnValue(mockProcess as any);

      mockEnvironmentsService.findOne.mockResolvedValue({ ...mockEnvironment, status: 'stopped' });
      mockApplicationsService.findOne.mockResolvedValue(mockApplication);

      await service.start('env-123', mockUser);

      // Emit close event with SIGKILL signal
      mockProcess.emit('close', null, 'SIGKILL');

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockDeploymentsService.updateStatus).toHaveBeenCalledWith('deployment-123', 'failed');
      expect(mockEnvironmentsService.updateStatus).toHaveBeenCalledWith('env-123', 'error', null, null);
    });
  });
});
