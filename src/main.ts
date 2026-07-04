import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { PrismaService } from './infra/prisma/prisma.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);

  app.setGlobalPrefix(config.get<string>('app.apiPrefix')!);

  // 全局 DTO 校验
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 全局守卫：先登录态 -> 再 RBAC 权限
  app.useGlobalGuards(
    app.get(JwtAuthGuard),
    new PermissionsGuard(reflector),
  );

  // 全局拦截器：审计 -> 统一响应包装
  app.useGlobalInterceptors(
    new AuditInterceptor(reflector, app.get(PrismaService)),
    new TransformInterceptor(),
  );

  // 全局异常
  app.useGlobalFilters(new AllExceptionsFilter());

  // 安全响应头 + CORS（内部前端域）
  app.enableCors({ origin: true, credentials: true });

  // Swagger（对齐 Codex 用；生产可关闭）
  if (config.get('app.env') !== 'production') {
    const doc = new DocumentBuilder()
      .setTitle('电子签章系统 API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'docs-api',
      app,
      SwaggerModule.createDocument(app, doc),
    );
  }

  const port = config.get<number>('app.port')!;
  await app.listen(port);
  new Logger('Bootstrap').log(`服务启动: http://localhost:${port}`);
}

void bootstrap();
