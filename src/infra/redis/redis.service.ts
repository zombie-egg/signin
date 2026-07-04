import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Redis 封装：登录白名单、一次性签署链接、限流由 ThrottlerStorage 复用同一实例 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Redis');
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const cfg = this.config.get('app.redis');
    this.client = new Redis({
      host: cfg.host,
      port: cfg.port,
      password: cfg.password,
      db: cfg.db,
      maxRetriesPerRequest: 3,
    });
    this.client.on('connect', () => this.logger.log('Redis 已连接'));
    this.client.on('error', (e) => this.logger.error(`Redis 错误: ${e.message}`));
  }

  onModuleDestroy(): void {
    void this.client?.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  // ---- 通用 ----
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, val: string, ttlSec?: number): Promise<void> {
    if (ttlSec) await this.client.set(key, val, 'EX', ttlSec);
    else await this.client.set(key, val);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  // ---- 键约定 ----
  /** JWT 白名单：登录时写入，登出/踢下线删除 */
  static tokenKey(userId: string, jti: string): string {
    return `auth:token:${userId}:${jti}`;
  }

  /** 一次性签署链接：value=taskId，TTL=截止时间；提交成功即删除 */
  static signLinkKey(token: string): string {
    return `sign:link:${token}`;
  }
}
