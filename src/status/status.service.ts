import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { exec } from 'child_process';
import { Application } from '../applications/entities/application.entity';
import { Environment } from '../environments/entities/environment.entity';

interface ToolStatus {
  available: boolean;
  version?: string;
  error?: string;
}

interface ContainerStatus {
  applicationName: string;
  environmentName: string;
  containerName: string;
  running: boolean;
  image?: string;
  status?: string;
}

export interface StatusReport {
  status: 'ok' | 'degraded';
  timestamp: string;
  tools: Record<string, ToolStatus>;
  containers: ContainerStatus[];
}

@Injectable()
export class StatusService {
  constructor(
    @InjectRepository(Application)
    private applicationsRepository: Repository<Application>,
    @InjectRepository(Environment)
    private environmentsRepository: Repository<Environment>,
  ) {}

  private probe(command: string, parseVersion: (stdout: string) => string, timeoutMs = 5000): Promise<ToolStatus> {
    return new Promise((resolve) => {
      const child = exec(command, { timeout: timeoutMs }, (error, stdout) => {
        if (error) {
          resolve({ available: false, error: error.message.split('\n')[0] });
        } else {
          resolve({ available: true, version: parseVersion(stdout.trim()) });
        }
      });

      child.on('error', (err) => {
        resolve({ available: false, error: err.message });
      });
    });
  }

  private execCommand(command: string, timeoutMs = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = exec(command, { timeout: timeoutMs }, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      });

      child.on('error', (err) => reject(err));
    });
  }

  private toContainerName(appName: string, envName: string): string {
    return `${appName.replace(/ /g, '_').toLowerCase()}__${envName.replace(/ /g, '_').toLowerCase()}`;
  }

  private async getRunningContainerNames(): Promise<Map<string, { image: string; status: string }>> {
    try {
      const output = await this.execCommand('docker ps --format "{{.Names}}|||{{.Image}}|||{{.Status}}"');
      const map = new Map<string, { image: string; status: string }>();
      if (!output) return map;
      for (const line of output.split('\n')) {
        const parts = line.split('|||');
        if (parts.length === 3) {
          map.set(parts[0].trim(), { image: parts[1].trim(), status: parts[2].trim() });
        }
      }
      return map;
    } catch {
      return new Map();
    }
  }

  async getStatus(): Promise<StatusReport> {
    const docker = await this.probe(
      'docker version --format "{{.Server.Version}}"',
      (out) => out,
    );

    const tools = { docker };
    const allAvailable = Object.values(tools).every((t) => t.available);

    const runningContainers = await this.getRunningContainerNames();

    const dockerApps = await this.applicationsRepository.find({ where: { type: 'docker' } });
    const containers: ContainerStatus[] = [];

    for (const app of dockerApps) {
      const environments = await this.environmentsRepository.find({
        where: { applicationId: app.id },
      });

      for (const env of environments) {
        const containerName = this.toContainerName(app.name, env.name);
        const info = runningContainers.get(containerName);
        containers.push({
          applicationName: app.name,
          environmentName: env.name,
          containerName,
          running: !!info,
          ...(info ? { image: info.image, status: info.status } : {}),
        });
      }
    }

    return {
      status: allAvailable ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      tools,
      containers,
    };
  }
}
