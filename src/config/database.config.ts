import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { User } from '../users/entities/user.entity';
import { Application } from '../applications/entities/application.entity';
import { Environment } from '../environments/entities/environment.entity';
import { Webhook } from '../webhooks/entities/webhook.entity';
import { Deployment } from '../deployments/entities/deployment.entity';

export const getDatabaseConfig = (): TypeOrmModuleOptions => ({
  type: 'better-sqlite3',
  database: process.env.DATABASE_PATH || join(process.cwd(), 'data', 'simple-carrier.db'),
  entities: [User, Application, Environment, Webhook, Deployment],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development+db',
});
