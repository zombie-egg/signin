import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** 软删除生效的模型：find* 自动追加 deletedAt=null，delete 改写为 update */
const SOFT_DELETE_MODELS = new Set([
  'User',
  'Role',
  'Seal',
  'Contract',
  'SignTask',
]);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit
{
  private readonly logger = new Logger('Prisma');

  constructor() {
    super();
    this.registerSoftDelete();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('数据库已连接');
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    process.on('beforeExit', () => {
      void app.close();
    });
  }

  /** 全局软删除中间件：业务表统一逻辑删除，审计/使用/签署记录表不注册删除，天然不受影响 */
  private registerSoftDelete(): void {
    this.$use(async (params, next) => {
      if (params.model && SOFT_DELETE_MODELS.has(params.model)) {
        // delete -> update deletedAt
        if (params.action === 'delete') {
          params.action = 'update';
          params.args = params.args ?? {};
          params.args.data = { deletedAt: new Date() };
        }
        if (params.action === 'deleteMany') {
          params.action = 'updateMany';
          params.args = params.args ?? {};
          params.args.data = { ...(params.args.data ?? {}), deletedAt: new Date() };
        }
        // 查询自动过滤已删除
        if (['findFirst', 'findMany', 'count'].includes(params.action)) {
          params.args = params.args ?? {};
          params.args.where = { deletedAt: null, ...(params.args.where ?? {}) };
        }
        if (params.action === 'findUnique') {
          params.action = 'findFirst';
          params.args.where = { ...params.args.where, deletedAt: null };
        }
      }
      return next(params);
    });
  }
}
