import { IsString, IsOptional, IsIn } from 'class-validator';
import type { ApplicationType } from '../entities/application.entity';

export class CreateApplicationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
  
  @IsIn(['repository', 'binary'])
  type: ApplicationType;

  @IsOptional()
  @IsString()
  repositoryUrl?: string;

  @IsOptional()
  @IsString()
  publicSSHKey?: string;

  @IsOptional()
  @IsString()
  buildCommand?: string;

  @IsOptional()
  @IsString()
  startCommand?: string;
}
