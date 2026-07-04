import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { PageResult, pageResult } from '../../common/dto/pagination.dto';
import {
  ContractStatus,
  TASK_STATUS_TO_INT,
  TASK_STATUS_TO_STR,
  TaskStatus,
} from '../../common/constants/enums';
import { genLinkToken, isPdfContract } from '../../common/utils/file.util';
import { CreateTaskDto, ListTaskDto, RevokeTaskDto } from './dto/sign-task.dto';

export interface TaskVO {
  id: string;
  contractId: string;
  contractName?: string;
  signerName: string;
  signerContact: string;
  status: string;
  deadline: Date;
  signUrl?: string;
  sha256?: string;
  signedIp?: string;
  signedDevice?: string;
  signedAt?: Date;
  createdAt: Date;
}

@Injectable()
export class SignTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async list(dto: ListTaskDto): Promise<PageResult<TaskVO>> {
    const where: Record<string, unknown> = {};
    if (dto.status && TASK_STATUS_TO_INT[dto.status] !== undefined) {
      where.status = TASK_STATUS_TO_INT[dto.status];
    }
    if (dto.signerName) where.signerName = { contains: dto.signerName };
    if (dto.startDate) where.createdAt = { gte: new Date(dto.startDate) };

    const [rows, total] = await Promise.all([
      this.prisma.signTask.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: dto.skip,
        take: dto.take,
        include: { contract: { select: { name: true } } },
      }),
      this.prisma.signTask.count({ where }),
    ]);
    return pageResult(rows.map((r) => this.toVO(r)), total, dto);
  }

  /** 创建签署任务：写待签字段、生成一次性链接(Redis TTL=截止时间) */
  async create(dto: CreateTaskDto, creatorId: string): Promise<{
    taskId: string;
    signUrl: string;
    expireAt: Date;
  }> {
    const contract = await this.prisma.contract.findFirst({
      where: { id: dto.contractId },
    });
    if (!contract) throw new BizException(ErrorCode.NOT_FOUND, '合同不存在');
    if (!isPdfContract(contract.mimeType, contract.fileExt)) {
      throw new BizException(
        ErrorCode.CONTRACT_ONLY_PDF,
        '仅 PDF 合同支持在线签署，其他格式请转为 PDF 后上传',
      );
    }
    if (
      contract.status !== ContractStatus.DRAFT &&
      contract.status !== ContractStatus.PENDING_SIGN
    ) {
      throw new BizException(ErrorCode.CONTRACT_STATE_NOT_ALLOWED);
    }

    const deadline = new Date(dto.deadline);
    if (isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
      throw new BizException(ErrorCode.TASK_DEADLINE_INVALID);
    }
    if (!dto.fields?.length) throw new BizException(ErrorCode.TASK_COORD_INVALID);

    const token = genLinkToken();
    const task = await this.prisma.signTask.create({
      data: {
        contractId: dto.contractId,
        signerName: dto.signerName,
        signerContact: dto.signerContact,
        linkToken: token,
        deadline,
        creatorId,
        fields: {
          create: dto.fields.map((f) => ({
            fieldType: f.fieldType,
            page: f.page,
            posX: f.posX,
            posY: f.posY,
            width: f.width,
            height: f.height,
          })),
        },
      },
    });

    // 合同流转为待签署
    if (contract.status === ContractStatus.DRAFT) {
      await this.prisma.contract.update({
        where: { id: contract.id },
        data: { status: ContractStatus.PENDING_SIGN },
      });
    }

    // 一次性链接：Redis 存 token->taskId，TTL=距截止秒数；提交成功即删
    const ttl = Math.max(1, Math.floor((deadline.getTime() - Date.now()) / 1000));
    await this.redis.set(RedisService.signLinkKey(token), task.id, ttl);

    return {
      taskId: task.id,
      signUrl: this.buildSignUrl(token),
      expireAt: deadline,
    };
  }

  async detail(id: string): Promise<TaskVO> {
    const task = await this.prisma.signTask.findFirst({
      where: { id },
      include: { contract: { select: { name: true } } },
    });
    if (!task) throw new BizException(ErrorCode.TASK_NOT_FOUND);
    const vo = this.toVO(task);
    if (task.status === TaskStatus.PENDING) {
      // 待签任务附带签署链接
      vo.signUrl = this.buildSignUrl(task.linkToken);
    } else if (task.status === TaskStatus.SIGNED) {
      // 已签署：附带最后一次签署的 IP/设备/时间（前端详情页展示）
      const rec = await this.prisma.signRecord.findFirst({
        where: { signTaskId: id },
        orderBy: { signedAt: 'desc' },
      });
      if (rec) {
        vo.signedIp = rec.ip ?? undefined;
        vo.signedDevice = rec.deviceInfo ?? rec.userAgent ?? undefined;
        vo.signedAt = rec.signedAt;
      }
    }
    return vo;
  }

  async revoke(id: string, dto: RevokeTaskDto): Promise<void> {
    const task = await this.prisma.signTask.findFirst({ where: { id } });
    if (!task) throw new BizException(ErrorCode.TASK_NOT_FOUND);
    if (task.status === TaskStatus.SIGNED) {
      throw new BizException(ErrorCode.TASK_SIGNED_CANNOT_REVOKE);
    }
    if (task.status !== TaskStatus.PENDING) {
      throw new BizException(ErrorCode.TASK_STATE_NOT_ALLOWED);
    }
    await this.prisma.signTask.update({
      where: { id },
      data: { status: TaskStatus.REVOKED, revokeReason: dto.reason },
    });
    // 链接立即失效
    await this.redis.del(RedisService.signLinkKey(task.linkToken));
  }

  async link(id: string): Promise<{ signUrl: string }> {
    const task = await this.prisma.signTask.findFirst({ where: { id } });
    if (!task) throw new BizException(ErrorCode.TASK_NOT_FOUND);
    return { signUrl: this.buildSignUrl(task.linkToken) };
  }

  private buildSignUrl(token: string): string {
    const base = this.config.get<string>('app.signLinkBaseUrl')!;
    return `${base}/${token}`;
  }

  private toVO(task: {
    id: string;
    contractId: string;
    signerName: string;
    signerContact: string;
    status: number;
    deadline: Date;
    archivedSha256: string | null;
    createdAt: Date;
    contract?: { name: string } | null;
  }): TaskVO {
    return {
      id: task.id,
      contractId: task.contractId,
      contractName: task.contract?.name,
      signerName: task.signerName,
      signerContact: task.signerContact,
      status: TASK_STATUS_TO_STR[task.status] ?? 'PENDING',
      deadline: task.deadline,
      sha256: task.archivedSha256 ?? undefined,
      createdAt: task.createdAt,
    };
  }
}
