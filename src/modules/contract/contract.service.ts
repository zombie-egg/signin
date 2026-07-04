import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MinioService } from '../../infra/minio/minio.service';
import { PdfService, StampLayer } from '../../infra/pdf/pdf.service';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { PageResult, pageResult } from '../../common/dto/pagination.dto';
import {
  CONTRACT_STATUS_TO_STR,
  ContractStatus,
  SealStatus,
} from '../../common/constants/enums';
import { isPdfMagic, md5, sha256, extname, isPdfContract, CONTRACT_MIME_EXT } from '../../common/utils/file.util';
import { getClientIp } from '../../common/utils/client.util';
import {
  CreateContractDto,
  ListContractDto,
  StampContractDto,
  StampPlacementDto,
} from './dto/contract.dto';

export interface ContractVO {
  id: string;
  name: string;
  serialNo: string;
  status: string;
  remark?: string;
  mimeType?: string;
  fileExt?: string;
  isPdf: boolean;
  createdAt: Date;
  uploadedAt: Date;
}

@Injectable()
export class ContractService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly pdf: PdfService,
  ) {}

  async list(dto: ListContractDto): Promise<PageResult<ContractVO>> {
    const where: Record<string, unknown> = {};
    if (dto.name) where.name = { contains: dto.name, mode: 'insensitive' };
    if (dto.serialNo) where.serialNo = { contains: dto.serialNo, mode: 'insensitive' };
    if (dto.status) {
      const map: Record<string, number> = {
        DRAFT: 0, PENDING_SIGN: 1, SIGNED: 2, VOIDED: 3, ARCHIVED: 4,
      };
      if (map[dto.status] !== undefined) where.status = map[dto.status];
    }
    if (dto.startDate || dto.endDate) {
      where.createdAt = {
        ...(dto.startDate ? { gte: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { lte: new Date(dto.endDate) } : {}),
      };
    }
    // 前端合同列表还支持按签署人筛选（关联任务）
    if (dto.signerName) {
      where.signTasks = { some: { signerName: { contains: dto.signerName } } };
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
    return pageResult(rows.map((r) => this.toVO(r)), total, dto);
  }

  async create(
    dto: CreateContractDto,
    file: Express.Multer.File,
    uploaderId: string,
  ): Promise<ContractVO> {
    if (!file) throw new BizException(ErrorCode.CONTRACT_ONLY_PDF, '请选择合同文件');

    // 支持任意常见合同文件类型；PDF 额外做结构校验（可在线盖章/签名）
    const ext = extname(file.originalname) || CONTRACT_MIME_EXT[file.mimetype] || '';
    const mime = file.mimetype || 'application/octet-stream';
    const isPdf = isPdfContract(mime, ext);
    if (isPdf) {
      if (!isPdfMagic(file.buffer)) {
        throw new BizException(ErrorCode.CONTRACT_ONLY_PDF, 'PDF 文件已损坏');
      }
      if (!(await this.pdf.isValidPdf(file.buffer))) {
        throw new BizException(ErrorCode.CONTRACT_SECURITY_FAIL);
      }
    }

    const fileMd5 = md5(file.buffer);
    const dupMd5 = await this.prisma.contract.findFirst({ where: { fileMd5 } });
    if (dupMd5) throw new BizException(ErrorCode.CONTRACT_DUPLICATED);

    const dupSerial = await this.prisma.contract.findFirst({
      where: { serialNo: dto.serialNo },
    });
    if (dupSerial) throw new BizException(ErrorCode.CONTRACT_SERIAL_EXISTS);

    const objectKey = await this.minio
      .putObject('contract', file.buffer, mime, ext || '.bin')
      .catch(() => {
        throw new BizException(ErrorCode.INTERNAL_ERROR, '存储服务不可用');
      });

    const contract = await this.prisma.contract.create({
      data: {
        name: dto.name,
        serialNo: dto.serialNo,
        remark: dto.remark,
        objectKey,
        mimeType: mime,
        fileExt: ext,
        fileMd5,
        fileSha256: sha256(file.buffer),
        fileSize: file.size,
        uploaderId,
      },
    });
    return this.toVO(contract);
  }

  async detail(id: string): Promise<ContractVO> {
    const c = await this.prisma.contract.findFirst({ where: { id } });
    if (!c) throw new BizException(ErrorCode.NOT_FOUND);
    return this.toVO(c);
  }

  async file(id: string): Promise<{ url: string }> {
    const c = await this.prisma.contract.findFirst({ where: { id } });
    if (!c) throw new BizException(ErrorCode.NOT_FOUND);
    const url = await this.minio.presignedGetUrl(c.objectKey);
    return { url };
  }

  /**
   * 管理员拖拽盖企业印章：把印章图叠加到 PDF 并回存，记录印章使用日志。
   * 坐标换算：前端 top-left 原点(pt) -> pdf-lib bottom-left。
   */
  async stamp(
    id: string,
    dto: StampContractDto,
    operatorId: string,
    req: Request,
  ): Promise<void> {
    const contract = await this.prisma.contract.findFirst({ where: { id } });
    if (!contract) throw new BizException(ErrorCode.NOT_FOUND);
    if (!isPdfContract(contract.mimeType, contract.fileExt)) {
      throw new BizException(
        ErrorCode.CONTRACT_ONLY_PDF,
        '仅 PDF 合同支持在线盖章，其他格式请转为 PDF 后上传',
      );
    }
    if (
      contract.status !== ContractStatus.DRAFT &&
      contract.status !== ContractStatus.PENDING_SIGN
    ) {
      throw new BizException(ErrorCode.CONTRACT_STATE_NOT_ALLOWED);
    }
    if (!dto.stamps?.length) throw new BizException(ErrorCode.TASK_COORD_INVALID);

    const pdfBuf = await this.minio.getObject(contract.objectKey);
    const pageSizes = await this.pdf.getPageSizes(pdfBuf);

    // 取印章图并组装图层
    const layers: StampLayer[] = [];
    const usageData: {
      sealId: string;
      placement: StampPlacementDto;
    }[] = [];

    for (const s of dto.stamps) {
      const seal = await this.prisma.seal.findFirst({ where: { id: s.sealId } });
      if (!seal) throw new BizException(ErrorCode.NOT_FOUND, '印章不存在');
      if (seal.status !== SealStatus.ENABLED) {
        throw new BizException(ErrorCode.SEAL_DISABLED);
      }
      const size = pageSizes[s.page];
      if (!size) throw new BizException(ErrorCode.TASK_COORD_INVALID);

      const sealImg = await this.minio.getObject(seal.objectKey);
      layers.push({
        page: s.page,
        posX: s.posX,
        posY: size.height - s.posY - s.height, // Y 轴翻转
        width: s.width,
        height: s.height,
        image: sealImg,
      });
      usageData.push({ sealId: s.sealId, placement: s });
    }

    const stamped = await this.pdf.overlayImages(pdfBuf, layers);
    const newKey = await this.minio.putObject(
      'contract',
      stamped,
      'application/pdf',
      '.pdf',
    );

    const ip = getClientIp(req);
    // 事务：更新合同 + 写印章使用日志（不可删）
    await this.prisma.$transaction([
      this.prisma.contract.update({
        where: { id },
        data: {
          objectKey: newKey,
          fileSha256: sha256(stamped),
          fileSize: stamped.length,
          // 盖章后进入待签署（若原为草稿）
          status:
            contract.status === ContractStatus.DRAFT
              ? ContractStatus.PENDING_SIGN
              : contract.status,
        },
      }),
      this.prisma.sealUsage.createMany({
        data: usageData.map((u) => ({
          sealId: u.sealId,
          contractId: id,
          operatorId,
          page: u.placement.page,
          posX: u.placement.posX,
          posY: u.placement.posY,
          width: u.placement.width,
          height: u.placement.height,
          ip,
        })),
      }),
    ]);
  }

  async void(id: string): Promise<void> {
    const c = await this.prisma.contract.findFirst({ where: { id } });
    if (!c) throw new BizException(ErrorCode.NOT_FOUND);
    if (c.status === ContractStatus.ARCHIVED) {
      throw new BizException(ErrorCode.CONTRACT_STATE_NOT_ALLOWED);
    }
    await this.prisma.contract.update({
      where: { id },
      data: { status: ContractStatus.VOIDED },
    });
  }

  async remove(id: string): Promise<void> {
    const c = await this.prisma.contract.findFirst({ where: { id } });
    if (!c) throw new BizException(ErrorCode.NOT_FOUND);
    await this.prisma.contract.delete({ where: { id } }); // 软删除
  }

  private toVO(c: {
    id: string;
    name: string;
    serialNo: string;
    status: number;
    remark: string | null;
    mimeType?: string | null;
    fileExt?: string | null;
    createdAt: Date;
  }): ContractVO {
    return {
      id: c.id,
      name: c.name,
      serialNo: c.serialNo,
      status: CONTRACT_STATUS_TO_STR[c.status] ?? 'DRAFT',
      remark: c.remark ?? undefined,
      mimeType: c.mimeType ?? undefined,
      fileExt: c.fileExt ?? undefined,
      isPdf: isPdfContract(c.mimeType, c.fileExt),
      createdAt: c.createdAt,
      uploadedAt: c.createdAt,
    };
  }
}
