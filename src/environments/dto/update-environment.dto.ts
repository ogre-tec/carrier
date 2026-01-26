import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateEnvironmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
