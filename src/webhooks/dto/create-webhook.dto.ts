import { IsUUID } from 'class-validator';

export class CreateWebhookDto {
  @IsUUID()
  applicationId: string;

  @IsUUID()
  environmentId: string;
}
