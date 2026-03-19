import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { CryptoModule } from './crypto/crypto.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ApplicationsModule } from './applications/applications.module';
import { EnvironmentsModule } from './environments/environments.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { DeploymentsModule } from './deployments/deployments.module';
import { DatabaseSeedModule } from './database/database-seed.module';

const rootPath = join(process.env['ROOT_PATH'] || __dirname, '..', 'public');

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath,
      exclude: ['/api/{*any}'],
    }),
    ConfigModule,
    CryptoModule,
    AuthModule,
    UsersModule,
    ApplicationsModule,
    EnvironmentsModule,
    WebhooksModule,
    DeploymentsModule,
    DatabaseSeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
