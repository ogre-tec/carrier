import { Controller, Get } from '@nestjs/common';
import { StatusService } from './status.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/status')
export class StatusController {
  constructor(private statusService: StatusService) {}

  @Get()
  @Public()
  getStatus() {
    return this.statusService.getStatus();
  }
}
