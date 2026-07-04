import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';
import { MinioService } from '../../infra/minio/minio.service';
import { PdfService, StampLayer } from '../../infra/pdf/pdf.service';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/constants/error-code';
import {
  ContractStatus,
  SignType,
  TaskStatus,
} from '../../common/constants/enums';
import { isImageMagic, sha256 } from '../../common/utils/file.util';
import { getClientIp } from '../../common/utils/client.util';

export interface PublicSignPayload {
  contractName: string;
  signerName: string;
  deadline: Date;
  previewUrl: string;
  fields: {
    fieldId: string;
    fieldType: number;
    page: number;
    posX: number;
    posY: number;
    width: number;
    height: number;
  }[];
}

/** 提交项：与前端 signatures[i][fieldId|signType|file] 对应 */
export interface SubmitItem {
  fieldId: string;
  signType: number; // 1手写 2个人印章
  file: Express.Multer.File;
}

@Injectable()
export class SignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly minio: MinioService,
    private readonly pdf: PdfService,
  ) {}

  /** 校验链接并返回待签信息。校验顺序：Redis(有效期/一次性) -> 任务状态 */
  async detail(token: string): Promise<PublicSignPayload> {
    const task = await this.validateToken(token);
    const contract = await this.prisma.contract.findFirst({
      where: { id: task.contractId },
    });
    if (!contract) throw new BizException(ErrorCode.SIGN_LINK_INVALID);

    const fields = await this.prisma.signerField.findMany({
      where: { signTaskId: task.id },
    });
    const previewUrl = await this.minio
      .presignedGetUrl(contract.objectKey)
      .catch(() => '');

    return {
      contractName: contract.name,
      signerName: task.signerName,
      deadline: task.deadline,
      previewUrl,
      fields: fields.map((f) => ({
        fieldId: f.id,
        fieldType: f.fieldType,
        page: f.page,
        posX: f.posX,
        posY: f.posY,
        width: f.width,
        height: f.height,
      })),
    };
  }

  async file(token: string): Promise<{ url: string }> {
    const task = await this.validateToken(token);
    const contract = await this.prisma.contract.findFirst({
      where: { id: task.contractId },
    });
    if (!contract) throw new BizException(ErrorCode.SIGN_LINK_INVALID);
    const url = await this.minio.presignedGetUrl(contract.objectKey);
    return { url };
  }

  /**
   * 提交签署：校验图片 -> 按坐标嵌入签名/印章 -> 写时间戳+防篡改哈希元数据
   * -> 生成归档件 -> 任务=已签署、合同=已归档 -> 记录签署明细 -> 站内提醒创建人。
   * 提交成功后一次性链接立即失效。
   */
  async submit(
    token: string,
    items: SubmitItem[],
    req: Request,
  ): Promise<{ signedAt: Date; sha256: string; archiveUrl?: string }> {
    const task = await this.validateToken(token);
    if (!items.length) throw new BizException(ErrorCode.SIGN_FILE_INVALID);

    const contract = await this.prisma.contract.findFirst({
      where: { id: task.contractId },
    });
    if (!contract) throw new BizException(ErrorCode.SIGN_LINK_INVALID);

    const fields = await this.prisma.signerField.findMany({
      where: { signTaskId: task.id },
    });
    const fieldMap = new Map(fields.map((f) => [f.id, f]));

    // 校验每张图并组装图层（Y 轴翻转）
    const pdfBuf = await this.minio.getObject(contract.objectKey);
    const pageSizes = await this.pdf.getPageSizes(pdfBuf);
    const layers: StampLayer[] = [];
    for (const it of items) {
      if (!it.file || !isImageMagic(it.file.buffer)) {
        throw new BizException(ErrorCode.SIGN_FILE_INVALID);
      }
      const field = fieldMap.get(it.fieldId);
      if (!field) throw new BizException(ErrorCode.SIGN_FILE_INVALID);
      const size = pageSizes[field.page];
      if (!size) throw new BizException(ErrorCode.SIGN_FILE_INVALID);
      layers.push({
        page: field.page,
        posX: field.posX,
        posY: size.height - field.posY - field.height,
        width: field.width,
        height: field.height,
        image: it.file.buffer,
      });
    }

    // 嵌入签名图层
    let signed = await this.pdf.overlayImages(pdfBuf, layers);
    // 计算内容哈希（写元数据前），再写时间戳+哈希元数据
    const signedAt = new Date();
    const contentHash = sha256(signed);
    signed = await this.pdf.writeSignMetadata(signed, {
      signedAt,
      contentHash,
      signer: task.signerName,
      taskId: task.id,
    });
    // 归档件最终哈希（含元数据）为对外校验依据
    const archivedSha256 = sha256(signed);

    const archivedKey = await this.minio.putObject(
      'archive',
      signed,
      'application/pdf',
      '.pdf',
    );

    const ip = getClientIp(req);
    const ua = (req.headers['user-agent'] as string) ?? undefined;

    // 事务：任务/合同状态、签署记录、字段标记、站内提醒
    await this.prisma.$transaction([
      this.prisma.signTask.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.SIGNED,
          archivedObjectKey: archivedKey,
          archivedSha256,
        },
      }),
      this.prisma.contract.update({
        where: { id: contract.id },
        data: {
          status: ContractStatus.ARCHIVED,
          fileSha256: archivedSha256,
        },
      }),
      this.prisma.signRecord.createMany({
        data: items.map((it) => ({
          signTaskId: task.id,
          signerFieldId: it.fieldId,
          signType: it.signType === 2 ? SignType.PERSONAL_SEAL : SignType.HANDWRITE,
          objectKey: archivedKey, // 归档件即最终结果，明细指向同一件
          ip,
          userAgent: ua,
          deviceInfo: ua,
        })),
      }),
      this.prisma.signerField.updateMany({
        where: { id: { in: items.map((i) => i.fieldId) } },
        data: { filled: true },
      }),
      // 站内提醒：通知任务创建人签署完成
      this.prisma.notification.create({
        data: {
          userId: task.creatorId,
          type: 'SIGN_COMPLETED',
          title: '签署完成',
          content: `签署人「${task.signerName}」已完成合同「${contract.name}」的签署`,
          bizType: 'sign_task',
          bizId: task.id,
        },
      }),
      // 审计（外部签署人，operator 为空）
      this.prisma.auditLog.create({
        data: {
          action: 'SIGN_SUBMIT',
          targetType: 'sign_task',
          targetId: task.id,
          ip,
          userAgent: ua,
          detail: { signer: task.signerName, sha256: archivedSha256 },
        },
      }),
    ]);

    // 一次性链接失效
    await this.redis.del(RedisService.signLinkKey(token));

    const archiveUrl = await this.minio
      .presignedGetUrl(archivedKey)
      .catch(() => undefined);
    return { signedAt, sha256: archivedSha256, archiveUrl };
  }

  /** 链接校验：Redis 存在(有效期内且未使用) + DB 任务处于待签 */
  private async validateToken(token: string) {
    const taskId = await this.redis.get(RedisService.signLinkKey(token));
    const task = await this.prisma.signTask.findFirst({
      where: { linkToken: token },
    });
    if (!task) throw new BizException(ErrorCode.SIGN_LINK_INVALID);
    if (task.status === TaskStatus.REVOKED) {
      throw new BizException(ErrorCode.SIGN_TASK_VOIDED);
    }
    if (task.status === TaskStatus.SIGNED) {
      throw new BizException(ErrorCode.SIGN_LINK_USED);
    }
    // Redis 无记录：过期或已使用
    if (!taskId) {
      if (task.deadline.getTime() <= Date.now()) {
        throw new BizException(ErrorCode.SIGN_LINK_EXPIRED);
      }
      throw new BizException(ErrorCode.SIGN_LINK_USED);
    }
    if (task.deadline.getTime() <= Date.now()) {
      throw new BizException(ErrorCode.SIGN_LINK_EXPIRED);
    }
    return task;
  }
}
