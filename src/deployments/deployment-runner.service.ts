import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DeploymentsService } from './deployments.service';
import { EnvironmentsService } from '../environments/environments.service';
import { ApplicationsService } from '../applications/applications.service';
import { User } from '../users/entities/user.entity';

interface RunningProcess {
  process: ChildProcess;
  deploymentId: string;
}

@Injectable()
export class DeploymentRunnerService {
  private readonly logger = new Logger(DeploymentRunnerService.name);
  private runningProcesses: Map<string, RunningProcess> = new Map();
  private nextPort = 4000;

  constructor(
    private deploymentsService: DeploymentsService,
    private environmentsService: EnvironmentsService,
    private applicationsService: ApplicationsService,
  ) {}

  async start(environmentId: string, user: User): Promise<{ deploymentId: string; port: number }> {
    const PROJECTS_PATH = process.env['PROJECTS_PATH'] || join(process.cwd(), 'projects');
    const environment = await this.environmentsService.findOne(environmentId, user);

    if (environment.status === 'running') {
      throw new BadRequestException('Environment is already running');
    }

    const application = await this.applicationsService.findOne(environment.applicationId, user);

    // Create deployment record
    const deployment = await this.deploymentsService.create(environmentId);

    // Assign port - use decrypted variables
    const variables = this.environmentsService.getDecryptedVariables(environment);
    const port = Number(variables?.PORT || variables?.port || this.nextPort++);
    if (this.nextPort > 5000) {
      this.nextPort = 4000;
    }

    if (application.type === 'docker') {
      await this.deploymentsService.updateStatus(deployment.id, 'building');

      const validProjectName = environment.application.name
        .replace(/ /g, '_')
        .toLowerCase()
        ;
      const envName = environment.name
        .replace(/ /g, '_')
        .toLowerCase()
        ;
      const envVars = Object.keys(variables).reduce((acc, key) => {
        const value = variables[key];
        if (!Number.isNaN(Number(key)) && !Number.isNaN(Number(value))) {
          return [...acc, '-p', `${key}:${value}`];
        }
        return [...acc, '-e', `${key}="${value}"`];
      }, [] as string[]);

      await this.simpleRunCommand(
        `docker pull ${application.dockerImage}`.split(' '),
        variables,
        PROJECTS_PATH,
      );

      const dockerCleanCommand = `docker container rm -f ${validProjectName}__${envName}`.split(' ');
      await this.simpleRunCommand(
        dockerCleanCommand,
        variables,
        PROJECTS_PATH,
      );
    
      const initialDockerRestartPolicy = application.dockerRestartPolicy === 'no'
        ? null
        : application.dockerRestartPolicy;
      const dockerRestartPolicy = initialDockerRestartPolicy === 'on-failure'
        ? `${initialDockerRestartPolicy}${application.dockerMaxRetries ? `:${application.dockerMaxRetries}` : ''}`
        : application.dockerRestartPolicy;
      const dockerRunCommand = [
        'docker',
        'run',
        '-d',
        ...(dockerRestartPolicy ? ['--restart', `${dockerRestartPolicy}`] : []),
        ...envVars,
        '--name',
        `${validProjectName}__${envName}`,
        `${application.dockerImage}`,
      ];
      console.log(dockerRunCommand.join(' '))
      await this.runCommand(
        dockerRunCommand,
        deployment.id,
        variables,
        PROJECTS_PATH,
      );


      await this.deploymentsService.updateStatus(deployment.id, 'running');
      await this.environmentsService.updateStatus(environmentId, 'running', port, -1);
      
      return {
        deploymentId: deployment.id,
        port: this.nextPort,
      };
    }

    if (!application.startCommand) {
      throw new BadRequestException('Application has no start command configured');
    }

    try {
      mkdirSync(PROJECTS_PATH, { recursive: true });
      // await this.simpleRunCommand(`mkdir -p ${PROJECTS_PATH} `, variables);
    } catch {}
    const projectFolder = `${application.id}_${environment.id}`;
    const PROJECT_PATH = join(PROJECTS_PATH, projectFolder);
    // Update environment status
    await this.environmentsService.updateStatus(environmentId, 'building');

    if (application.repositoryUrl) {
      await this.deploymentsService.appendLog(deployment.id, `Clonning repository from ${application.repositoryUrl}`);

      try {
        const validProjectName = environment.application.name
          .replace(/ /g, '_')
          .toLowerCase()
          ;
        await this.simpleRunCommand(
          `rm -Rf ${projectFolder}`,
          variables,
          PROJECTS_PATH,
        );
        const sshFilePath = environment.application.publicSSHKey
          ? join(PROJECTS_PATH, `${projectFolder}.key`)
          : '';
        let validHostName = `unknown-${validProjectName}`;
        let hostName = `unknown.com`;
        if (sshFilePath && environment.application.publicSSHKey) {
          const providerName = application.repositoryUrl.includes('github')
            ? 'github'
            : 'gitlab'
            ;
          hostName = `${providerName}.com`;
          validHostName = `${providerName}-${validProjectName}`;
          writeFileSync(sshFilePath, `${environment.application.publicSSHKey?.trim()}\n`)
          await this.runCommand(
            `chmod 600 ${sshFilePath}`,
            deployment.id,
            variables,
            PROJECTS_PATH,
          );
          const sshConfigPath = join(process.env.HOME || '~', '.ssh', 'config')
          const content = `Host ${validHostName}
  HostName ${hostName}
  User git
  IdentityFile ${sshFilePath}
`;
          writeFileSync(sshConfigPath, content)
        }
        const path = application.repositoryUrl.split(hostName)[1];
        const cloneCmd = sshFilePath
          ? `git clone git@${validHostName}:${path} ${projectFolder}`
          : `git clone ${application.repositoryUrl} ${projectFolder}`;
        await this.runCommand(
          cloneCmd,
          deployment.id,
          variables,
          PROJECTS_PATH,
        );
        await this.deploymentsService.appendLog(deployment.id, 'Build completed successfully');
      } catch (error) {
        console.log(error)
        await this.deploymentsService.appendLog(deployment.id, `Build failed: ${error}`);
        await this.deploymentsService.updateStatus(deployment.id, 'failed');
        await this.environmentsService.updateStatus(environmentId, 'error');
        throw new BadRequestException('Build failed');
      }
    }

    // Build if needed
    if (application.dependenciesInstall) {
      await this.deploymentsService.appendLog(deployment.id, `Installing dependencies: ${application.dependenciesInstall}`);
      
      try {
        await this.runCommand(
          application.dependenciesInstall,
          deployment.id,
          variables,
          PROJECT_PATH,
        );
        await this.deploymentsService.appendLog(deployment.id, 'Build completed successfully');
      } catch (error) {
        await this.deploymentsService.appendLog(deployment.id, `Build failed: ${error}`);
        await this.deploymentsService.updateStatus(deployment.id, 'failed');
        await this.environmentsService.updateStatus(environmentId, 'error');
        throw new BadRequestException('Install failed');
      }
    }

    // Build if needed
    if (application.buildCommand) {
      await this.deploymentsService.appendLog(deployment.id, `Running build command: ${application.buildCommand}`);
      
      try {
        await this.runCommand(
          application.buildCommand,
          deployment.id,
          variables,
          PROJECT_PATH,
        );
        await this.deploymentsService.appendLog(deployment.id, 'Build completed successfully');
      } catch (error) {
        await this.deploymentsService.appendLog(deployment.id, `Build failed: ${error}`);
        await this.deploymentsService.updateStatus(deployment.id, 'failed');
        await this.environmentsService.updateStatus(environmentId, 'error');
        throw new BadRequestException('Build failed');
      }
    }

    // Start the application
    await this.deploymentsService.appendLog(deployment.id, `Starting application on port ${port}`);

    const envVars = {
      // ...process.env,
      PATH: process.env.PATH,
      ...variables,
      PORT: String(port),
    };
    const processEnvData = {
      shell: true,
      env: envVars,
      cwd: PROJECT_PATH || process.cwd(),
    };

    this.logger.log(`[${application.name}] STARTING Application ${application.name}`)
    const childProcess = spawn(application.startCommand, [], processEnvData);

    childProcess.stdout?.on('data', async (data) => {
      await this.deploymentsService.appendLog(deployment.id, `[stdout] ${data.toString().trim()}`);
    });

    childProcess.stderr?.on('data', async (data) => {
      await this.deploymentsService.appendLog(deployment.id, `[stderr] ${data.toString().trim()}`);
    });

    childProcess.on('close', async (code, signal) => {
      this.logger.log(`[${application.name}] Closing Application ${application.name}`)
      if (code !== null) {
        await this.deploymentsService.appendLog(deployment.id, `Process exited with code ${code}`);
        await this.deploymentsService.updateStatus(deployment.id, code === 0 ? 'stopped' : 'failed');
        await this.environmentsService.updateStatus(environmentId, code === 0 ? 'stopped' : 'error', null, null);
      } else if (signal !== null) {
        await this.deploymentsService.appendLog(deployment.id, `Process exited with signal ${signal}`);
        await this.deploymentsService.updateStatus(deployment.id, signal === 'SIGTERM' ? 'stopped' : 'failed');
        await this.environmentsService.updateStatus(environmentId, signal === 'SIGTERM' ? 'stopped' : 'error', null, null);
      }
      this.runningProcesses.delete(environmentId);
    });

    this.runningProcesses.set(environmentId, {
      process: childProcess,
      deploymentId: deployment.id,
    });

    await this.deploymentsService.updateStatus(deployment.id, 'running');
    await this.environmentsService.updateStatus(environmentId, 'running', port, childProcess.pid);

    this.logger.log(`[${application.name}] ... RUNNING Application ${application.name}`)

    return { deploymentId: deployment.id, port };
  }

  async stop(environmentId: string, user: User): Promise<void> {
    const environment = await this.environmentsService.findOne(environmentId, user);
    const application = await this.applicationsService.findOne(environment.applicationId, user);

    if (environment.status !== 'running') {
      throw new BadRequestException('Environment is not running');
    }

    if (application.type === 'docker') {
      const validProjectName = environment.application.name
        .replace(/ /g, '_')
        .toLowerCase()
        ;
      const envName = environment.name
        .replace(/ /g, '_')
        .toLowerCase()
        ;
      await this.simpleRunCommand(
        `docker container stop ${validProjectName}__${envName}`.split(' '),
        {},
        '.',
      );
      await this.environmentsService.updateStatus(environmentId, 'stopped', null, null);
    }

    const running = this.runningProcesses.get(environmentId);
    if (running) {
      running.process.kill('SIGTERM');
      await this.deploymentsService.appendLog(running.deploymentId, 'Received stop signal');
    }

    await this.environmentsService.updateStatus(environmentId, 'stopped', null, null);
  }

  async restart(environmentId: string, user: User): Promise<{ deploymentId: string; port: number }> {
    try {
      await this.stop(environmentId, user);
    } catch {
      // Ignore if not running
    }

    return this.start(environmentId, user);
  }

  private runCommand(command: string | string[], deploymentId: string, env: Record<string, string>, pwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let str = '\n';
      const [cmd, ...camdArgs] = typeof command === 'string'
        ? [command]
        : command;
      const child = spawn(cmd, camdArgs, {
        // shell: true,
        env: { ...process.env, ...env },
        cwd: pwd || process.cwd(),
      });

      child.stdout?.on('data', async (data) => {
        str += `[build] ${data.toString().trim()}\n`;
        await this.deploymentsService.appendLog(deploymentId, `[build] ${data.toString().trim()}`);
      });

      child.stderr?.on('data', async (data) => {
        str += `[build] ${data.toString().trim()}\n`;
        await this.deploymentsService.appendLog(deploymentId, `[build-err] ${data.toString().trim()}`);
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve(str);
        } else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });

      child.on('error', (data) => {
        reject(data)
      });
    });
  }

  private simpleRunCommand(command: string | string[], env: Record<string, string>, pwd?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const [cmd, ...camdArgs] = typeof command === 'string'
        ? [command]
        : command;
      console.log([cmd, camdArgs])
      const child = spawn(cmd, camdArgs, {
        // shell: true,
        env: { ...process.env, ...env },
        cwd: pwd || process.cwd(),
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }
}
