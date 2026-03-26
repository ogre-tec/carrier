import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';

interface ToolStatus {
  available: boolean;
  version?: string;
  error?: string;
}

export interface StatusReport {
  status: 'ok' | 'degraded';
  timestamp: string;
  tools: Record<string, ToolStatus>;
}

@Injectable()
export class StatusService {
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

  async getStatus(): Promise<StatusReport> {
    const docker = await this.probe(
      'docker version --format "{{.Server.Version}}"',
      (out) => out,
    );

    const tools = { docker };
    const allAvailable = Object.values(tools).every((t) => t.available);

    return {
      status: allAvailable ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      tools,
    };
  }
}
