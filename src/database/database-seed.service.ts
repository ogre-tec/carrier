import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(private usersService: UsersService) {}

  async onApplicationBootstrap() {
    await this.seedAdminUser();
  }

  private async seedAdminUser() {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      this.logger.warn('ADMIN_PASSWORD env var is not set — skipping admin user seed');
      return;
    }

    const email = process.env.ADMIN_EMAIL || 'admin@local.host';
    const name = process.env.ADMIN_NAME || 'Administrator';

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      this.logger.log(`Admin user already exists (${email}) — skipping seed`);
      return;
    }

    const user = await this.usersService.create({
      email,
      name,
      password,
      role: UserRole.ADMIN,
    });

    // Activate the admin user immediately
    const created = await this.usersService.findByEmail(email);
    if (created) {
      await this.usersService.setActive(created.id, true);
    }

    this.logger.log(`Admin user created: ${email}`);
  }
}
