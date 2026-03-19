import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { DatabaseSeedService } from './database-seed.service';

@Module({
  imports: [UsersModule],
  providers: [DatabaseSeedService],
})
export class DatabaseSeedModule {}
