import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MinioService } from '../../infra/minio/minio.service';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/constants/error-code';
import {
  PageResult,
  pageResult,
} from '../../common/dto/pagination.dto';
import {
  SEAL_STATUS_TO_INT,
  SEAL_STATUS_TO_STR,
  SEAL_TYPE_TO_INT,
  SEAL_TYPE_TO_STR,
} from '../../common/constants/enums';
import { isPngMagic, md5 } from '../../common/utils/file.util';
import { CreateSealDto, ListSealDto, UpdateSealStatusDto } from './dto/seal.dto';

export interface SealVO {
  id: string;
  name: string;
  type: string;
  status: string;
  previewUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SealService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async list(dto: ListSealDto): Promise<PageResult<SealVO>> {
    const where: Record<string, unknown> = {};
    if (dto.name) where.name = { contains: dto.name, mode: 'insensitive' };
    if (dto.status) where.status = SEAL_STATUS_TO_INT[dto.status];

    const [rows, total] = await Promise.all([
      this.prisma.seal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: dto.skip,
        take: dto.take,
      }),
      this.prisma.seal.count({ where }),
    ]);

    // 列表返回预签名预览URL（短时效），前端 SealCard 直接用
    const list = await Promise.all(rows.map((r) => this.toVO(r, true)));
    return pageResult(list, total, dto);
  }

  /**
   * 上传印章：校验透明PNG -> 压缩 -> 叠加防盗盲水印 -> MD5去重 -> 存MinIO。
   */
  async create(
    dto: CreateSealDto,
    file: Express.Multer.File,
    uploaderId: string,
  ): Promise<SealVO> {
    if (!file) throw new BizException(ErrorCode.SEAL_FORMAT_INVALID);
    if (!isPngMagic(file.buffer)) {
      throw new BizException(ErrorCode.SEAL_FORMAT_INVALID);
    }

    const fileMd5 = md5(file.buffer);
    const dup = await this.prisma.seal.findFirst({ where: { fileMd5 } });
    if (dup) throw new BizException(ErrorCode.SEAL_DUPLICATED);

    const processed = await this.processSeal(file.buffer);
    const objectKey = await this.minio
      .putObject('seal', processed, 'image/png', '.png')
      .catch(() => {
        throw new BizException(
          ErrorCode.INTERNAL_ERROR,
          '存储服务不可用，无法保存印章',
        );
      });

    const seal = await this.prisma.seal.create({
      data: {
        name: dto.name,
        type: SEAL_TYPE_TO_INT[dto.type] ?? 1,
        objectKey,
        fileMd5,
        uploaderId,
      },
    });
    return this.toVO(seal, true);
  }

  async updateStatus(id: string, dto: UpdateSealStatusDto): Promise<void> {
    const seal = await this.prisma.seal.findFirst({ where: { id } });
    if (!seal) throw new BizException(ErrorCode.NOT_FOUND);
    await this.prisma.seal.update({
      where: { id },
      data: { status: SEAL_STATUS_TO_INT[dto.status] },
    });
  }

  async remove(id: string): Promise<void> {
    const seal = await this.prisma.seal.findFirst({ where: { id } });
    if (!seal) throw new BizException(ErrorCode.NOT_FOUND);
    await this.prisma.seal.delete({ where: { id } }); // 软删除
  }

  /** 印章原图预签名URL（权限 seal:download 控制在控制器） */
  async preview(id: string): Promise<{ url: string }> {
    const seal = await this.prisma.seal.findFirst({ where: { id } });
    if (!seal) throw new BizException(ErrorCode.NOT_FOUND);
    const url = await this.minio.presignedGetUrl(seal.objectKey);
    return { url };
  }

  /** 印章使用记录（映射成前端 AuditLog 形态） */
  async usage(id: string): Promise<PageResult<Record<string, unknown>>> {
    const rows = await this.prisma.sealUsage.findMany({
      where: { sealId: id },
      orderBy: { usedAt: 'desc' },
      take: 100,
    });
    const list = await Promise.all(
      rows.map(async (r) => {
        const operator = await this.prisma.user.findFirst({
          where: { id: r.operatorId },
        });
        return {
          id: r.id,
          actorName: operator?.realName ?? operator?.username ?? '未知',
          action: 'SEAL_USE',
          targetType: 'contract',
          targetId: r.contractId,
          ip: r.ip ?? undefined,
          createdAt: r.usedAt,
        };
      }),
    );
    return { list, total: list.length, page: 1, pageSize: list.length };
  }

  // ---- 内部 ----

  /** 压缩 + 叠加平铺盲水印文字，降低被盗用风险 */
  private async processSeal(input: Buffer): Promise<Buffer> {
    const base = sharp(input).resize({
      width: 512,
      height: 512,
      fit: 'inside',
      withoutEnlargement: true,
    });
    const meta = await base.metadata();
    const w = meta.width ?? 512;
    const h = meta.height ?? 512;

    // 半透明水印 SVG
    const watermark = Buffer.from(
      `<svg width="${w}" height="${h}">
        <text x="50%" y="50%" font-size="14" fill="rgba(0,0,0,0.12)"
          text-anchor="middle" transform="rotate(-30 ${w / 2} ${h / 2})">
          仅限内部使用
        </text>
      </svg>`,
    );

    return base
      .composite([{ input: watermark, tile: true, blend: 'over' }])
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  private async toVO(
    seal: {
      id: string;
      name: string;
      type: number;
      status: number;
      objectKey: string;
      createdAt: Date;
      updatedAt: Date;
    },
    withPreview: boolean,
  ): Promise<SealVO> {
    let previewUrl: string | undefined;
    if (withPreview) {
      previewUrl = await this.minio
        .presignedGetUrl(seal.objectKey)
        .catch(() => undefined);
    }
    return {
      id: seal.id,
      name: seal.name,
      type: SEAL_TYPE_TO_STR[seal.type] ?? 'OTHER',
      status: SEAL_STATUS_TO_STR[seal.status] ?? 'DISABLED',
      previewUrl,
      createdAt: seal.createdAt,
      updatedAt: seal.updatedAt,
    };
  }
}
