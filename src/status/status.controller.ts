import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatusService } from './status.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/status')
@UseGuards(JwtAuthGuard)
export class StatusController {
  constructor(private statusService: StatusService) {}

  @Get()
  getStatus() {
    return this.statusService.getStatus();
  }
}
