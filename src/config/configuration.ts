import { registerAs } from '@nestjs/config';

/** 集中式配置，所有环境变量在此收敛，禁止散落读取 process.env */
export default registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    accessTtl: parseInt(process.env.JWT_ACCESS_TTL ?? '7200', 10),
    refreshTtl: parseInt(process.env.JWT_REFRESH_TTL ?? '604800', 10),
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
  },

  minio: {
    endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY as string,
    secretKey: process.env.MINIO_SECRET_KEY as string,
    bucket: process.env.MINIO_BUCKET ?? 'esign',
    presignTtl: parseInt(process.env.MINIO_PRESIGN_TTL ?? '300', 10),
  },

  storage: {
    keyEncSecret: process.env.STORAGE_KEY_ENC_SECRET as string,
  },

  security: {
    loginMaxFail: parseInt(process.env.LOGIN_MAX_FAIL ?? '5', 10),
    loginLockMinutes: parseInt(process.env.LOGIN_LOCK_MINUTES ?? '15', 10),
    uploadContractMaxMb: parseInt(process.env.UPLOAD_CONTRACT_MAX_MB ?? '50', 10),
    uploadSealMaxMb: parseInt(process.env.UPLOAD_SEAL_MAX_MB ?? '5', 10),
  },

  signLinkBaseUrl: process.env.SIGN_LINK_BASE_URL ?? 'http://localhost:5173/sign',
}));
