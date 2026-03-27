import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { NginxService } from './nginx.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('api/nginx')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class NginxController {
  constructor(private readonly nginxService: NginxService) {}

  @Get()
  getConfig() {
    return this.nginxService.getConfig();
  }

  @Get('raw')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="nginx.conf"')
  async getConfigRaw() {
    const report = await this.nginxService.getConfig();
    return report.config;
  }
}
