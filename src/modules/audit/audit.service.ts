import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PageResult, pageResult, PaginationDto } from '../../common/dto/pagination.dto';

export class ListAuditDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  targetType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  operatorId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  endDate?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** 审计日志查询。映射 operatorName -> actorName（前端字段） */
  async list(dto: ListAuditDto): Promise<PageResult<unknown>> {
    const where: Record<string, unknown> = {};
    if (dto.action) where.action = dto.action;
    if (dto.targetType) where.targetType = dto.targetType;
    if (dto.operatorId) where.operatorId = dto.operatorId;
    if (dto.startDate || dto.endDate) {
      where.createdAt = {
        ...(dto.startDate ? { gte: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { lte: new Date(dto.endDate) } : {}),
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: dto.skip,
        take: dto.take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const list = rows.map((r) => ({
      id: r.id,
      actorName: r.operatorName ?? '外部签署人',
      action: r.action,
      targetType: r.targetType ?? '',
      targetId: r.targetId ?? '',
      ip: r.ip ?? undefined,
      createdAt: r.createdAt,
    }));
    return pageResult(list, total, dto);
  }
}
