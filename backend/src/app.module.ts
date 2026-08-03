import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Modules
import { AuthModule } from './auth/auth.module';
import { AiGatewayModule } from './ai-gateway/ai-gateway.module';
import { JournalsModule } from './journals/journals.module';
import { AdminModule } from './admin/admin.module';

// Entities
import { User } from './users/entities/user.entity';
import { Subscription } from './subscriptions/entities/subscription.entity';
import { AiGatewayLog } from './ai-gateway/entities/ai-log.entity';
import { Journal } from './journals/entities/journal.entity';
import { GamificationState } from './gamification/entities/gamification-state.entity';

@Module({
  imports: [
    // Serve static files from /public → http://localhost:3001/
    // NestJS API controllers are registered first and always take priority.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),

    // Global Configurations
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Dynamic Database Configuration via TypeORM (Postgres or SQLite fallback)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const dbType = configService.get<string>('DB_TYPE') || 'postgres';

        if (dbType === 'sqlite') {
          const dbPath = configService.get<string>('DB_PATH') || 'database.sqlite';
          return {
            type: 'better-sqlite3' as any,
            database: dbPath,
            entities: [User, Subscription, AiGatewayLog, Journal, GamificationState],
            synchronize: true,
          };
        }

        const dbUrl = configService.get<string>('DATABASE_URL');
        if (dbUrl) {
          return {
            type: 'postgres' as any,
            url: dbUrl,
            entities: [User, Subscription, AiGatewayLog, Journal, GamificationState],
            synchronize: true,
            ssl: { rejectUnauthorized: false },
          };
        }

        return {
          type: 'postgres' as any,
          host: configService.get<string>('DB_HOST') || 'localhost',
          port: configService.get<number>('DB_PORT') || 5432,
          username: configService.get<string>('DB_USERNAME') || 'postgres',
          password: configService.get<string>('DB_PASSWORD') || 'postgres',
          database: configService.get<string>('DB_NAME') || 'postgres',
          entities: [User, Subscription, AiGatewayLog, Journal, GamificationState],
          synchronize: true,
          ssl: configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        };
      },
    }),

    // Core Business Modules
    AuthModule,
    AiGatewayModule,
    JournalsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
