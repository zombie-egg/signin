import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import * as crypto from 'node:crypto';

/**
 * 对象存储服务。
 * - 私有桶，禁止匿名访问；对外仅签发短时效预签名URL。
 * - objectKey 用 AES-256-GCM 加密业务路径，不可枚举、防URL遍历。
 */
@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger('MinIO');
  private client!: MinioClient;
  private bucket!: string;
  private presignTtl!: number;
  private encKey!: Buffer;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const cfg = this.config.get('app.minio');
    this.bucket = cfg.bucket;
    this.presignTtl = cfg.presignTtl;

    if (!cfg.accessKey || !cfg.secretKey) {
      this.logger.warn('MinIO 未配置，文件相关功能将不可用');
      return;
    }

    const secret = this.config.get<string>('app.storage.keyEncSecret');
    if (!secret || !/^[0-9a-fA-F]{64}$/.test(secret)) {
      this.logger.warn('STORAGE_KEY_ENC_SECRET 未正确配置，文件相关功能将不可用');
      return;
    }

    this.encKey = Buffer.from(
      secret,
      'hex',
    );

    // 建桶失败不阻断启动（如登录等非文件操作无需 MinIO）；首次用到文件时再确保桶存在
    try {
      this.client = new MinioClient({
        endPoint: cfg.endPoint,
        port: cfg.port,
        useSSL: cfg.useSSL,
        accessKey: cfg.accessKey,
        secretKey: cfg.secretKey,
      });
      await this.ensureBucket();
    } catch (e) {
      this.logger.warn(
        `MinIO 暂不可用，文件相关功能将不可用: ${(e as Error).message}`,
      );
    }
  }

  /** 确保桶存在，文件上传前调用；MinIO 未就绪时抛错由调用方处理 */
  async ensureBucket(): Promise<void> {
    this.ensureAvailable();
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`已创建私有桶 ${this.bucket}`);
    }
  }

  /**
   * 上传对象，返回加密后的 objectKey（存DB）。
   * @param category 逻辑目录: contract | seal | signature | archive
   */
  async putObject(
    category: string,
    buffer: Buffer,
    contentType: string,
    ext: string,
  ): Promise<string> {
    this.ensureAvailable();
    await this.ensureBucket();
    const rawPath = `${category}/${crypto.randomUUID()}${ext}`;
    await this.client.putObject(this.bucket, rawPath, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    return this.encryptKey(rawPath);
  }

  async getObject(objectKey: string): Promise<Buffer> {
    this.ensureAvailable();
    const rawPath = this.decryptKey(objectKey);
    const stream = await this.client.getObject(this.bucket, rawPath);
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    return Buffer.concat(chunks);
  }

  /** 签发短时效预签名URL，供前端临时预览/下载 */
  async presignedGetUrl(objectKey: string, ttlSec?: number): Promise<string> {
    this.ensureAvailable();
    const rawPath = this.decryptKey(objectKey);
    return this.client.presignedGetObject(
      this.bucket,
      rawPath,
      ttlSec ?? this.presignTtl,
    );
  }

  // ---- objectKey 加解密 (AES-256-GCM) ----
  private encryptKey(rawPath: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encKey, iv);
    const enc = Buffer.concat([cipher.update(rawPath, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // iv(12) + tag(16) + cipher，base64url 便于放URL
    return Buffer.concat([iv, tag, enc]).toString('base64url');
  }

  private ensureAvailable(): void {
    if (!this.client) {
      throw new Error('MinIO is not configured');
    }
  }

  private decryptKey(objectKey: string): string {
    const raw = Buffer.from(objectKey, 'base64url');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }
}
