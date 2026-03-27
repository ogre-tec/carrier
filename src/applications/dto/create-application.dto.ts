import { IsString, IsOptional, IsIn, IsInt, IsBoolean, Min } from 'class-validator';
import type { ApplicationType, DockerRestartPolicy } from '../entities/application.entity';

export class CreateApplicationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
  
  @IsIn(['repository', 'binary', 'docker'])
  type: ApplicationType;

  @IsOptional()
  @IsString()
  repositoryUrl?: string;

  @IsOptional()
  @IsString()
  dockerImage?: string;

  @IsOptional()
  @IsIn(['no', 'unless-stopped', 'always', 'on-failure'])
  dockerRestartPolicy?: DockerRestartPolicy;

  @IsOptional()
  @IsInt()
  @Min(1)
  dockerMaxRetries?: number;

  @IsOptional()
  @IsString()
  publicSSHKey?: string;

  @IsOptional()
  @IsString()
  dependenciesInstall?: string;

  @IsOptional()
  @IsString()
  buildCommand?: string;

  @IsOptional()
  @IsString()
  startCommand?: string;

  @IsOptional()
  @IsBoolean()
  exposeViaProxy?: boolean;
}
