import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MinioService } from '../../infra/minio/minio.service';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { PageResult, pageResult } from '../../common/dto/pagination.dto';
import { CONTRACT_STATUS_TO_STR } from '../../common/constants/enums';
import { isPdfMagic, sha256 } from '../../common/utils/file.util';
import { ListContractDto } from '../contract/dto/contract.dto';

@Injectable()
export class ArchiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  /** 归档合同多条件筛选（复用合同列表筛选，默认展示已签署/已归档） */
  async list(dto: ListContractDto): Promise<PageResult<unknown>> {
    const where: Record<string, unknown> = {};
    if (dto.name) where.name = { contains: dto.name, mode: 'insensitive' };
    if (dto.serialNo) where.serialNo = { contains: dto.serialNo, mode: 'insensitive' };
    const statusMap: Record<string, number> = {
      DRAFT: 0, PENDING_SIGN: 1, SIGNED: 2, VOIDED: 3, ARCHIVED: 4,
    };
    where.status = dto.status && statusMap[dto.status] !== undefined
      ? statusMap[dto.status]
      : { in: [2, 4] }; // 默认已签署+已归档
    if (dto.signerName) {
      where.signTasks = { some: { signerName: { contains: dto.signerName } } };
    }
    if (dto.startDate || dto.endDate) {
      where.createdAt = {
        ...(dto.startDate ? { gte: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { lte: new Date(dto.endDate) } : {}),
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: dto.skip,
        take: dto.take,
      }),
      this.prisma.contract.count({ where }),
    ]);
    const list = rows.map((c) => ({
      id: c.id,
      name: c.name,
      serialNo: c.serialNo,
      status: CONTRACT_STATUS_TO_STR[c.status] ?? 'DRAFT',
      uploadedAt: c.createdAt,
      createdAt: c.createdAt,
    }));
    return pageResult(list, total, dto);
  }

  /** 下载归档件（优先归档版；无则回落合同当前件） */
  async download(id: string): Promise<{ url: string }> {
    const contract = await this.prisma.contract.findFirst({ where: { id } });
    if (!contract) throw new BizException(ErrorCode.NOT_FOUND);
    const task = await this.prisma.signTask.findFirst({
      where: { contractId: id, archivedObjectKey: { not: null } },
      orderBy: { updatedAt: 'desc' },
    });
    const key = task?.archivedObjectKey ?? contract.objectKey;
    const url = await this.minio.presignedGetUrl(key);
    return { url };
  }

  /**
   * 哈希校验：上传 PDF，计算 SHA256 与库内归档哈希比对，判断是否被篡改。
   */
  async verify(
    contractId: string,
    file: Express.Multer.File,
  ): Promise<{
    match: boolean;
    expectedSha256: string;
    actualSha256: string;
    signedAt?: Date;
  }> {
    if (!file || !isPdfMagic(file.buffer)) {
      throw new BizException(ErrorCode.ARCHIVE_VERIFY_FILE_INVALID);
    }
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId },
    });
    if (!contract) throw new BizException(ErrorCode.NOT_FOUND);

    const task = await this.prisma.signTask.findFirst({
      where: { contractId, archivedSha256: { not: null } },
      orderBy: { updatedAt: 'desc' },
    });
    const expected = task?.archivedSha256 ?? contract.fileSha256;
    const actual = sha256(file.buffer);

    return {
      match: expected === actual,
      expectedSha256: expected,
      actualSha256: actual,
      signedAt: task?.updatedAt,
    };
  }
}
