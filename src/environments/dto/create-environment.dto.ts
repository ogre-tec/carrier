import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateEnvironmentDto {
  @IsString()
  name: string;

  @IsString()
  applicationId: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
