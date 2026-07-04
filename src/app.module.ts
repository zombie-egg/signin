import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import configuration from './config/configuration';

import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { MinioModule } from './infra/minio/minio.module';
import { PdfModule } from './infra/pdf/pdf.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { SealModule } from './modules/seal/seal.module';
import { ContractModule } from './modules/contract/contract.module';
import { SignTaskModule } from './modules/sign-task/sign-task.module';
import { SignModule } from './modules/sign/sign.module';
import { ArchiveModule } from './modules/archive/archive.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationModule } from './modules/notification/notification.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    // 全局限流：默认 100次/分钟/IP，各接口可用 @Throttle 覆盖
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // JWT 全局可用（供全局 JwtAuthGuard 注入）
    JwtModule.register({ global: true }),

    // 基建
    PrismaModule,
    RedisModule,
    MinioModule,
    PdfModule,

    // 业务模块
    AuthModule,
    UserModule,
    SealModule,
    ContractModule,
    SignTaskModule,
    SignModule,
    ArchiveModule,
    AuditModule,
    NotificationModule,
  ],
  providers: [
    JwtAuthGuard, // 供 main.ts useGlobalGuards 注入
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  controllers: [HealthController],
})
export class AppModule {}
