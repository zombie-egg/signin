import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** 分页入参基类，各列表 DTO 继承 */
export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize: number = 20;

  get skip(): number {
    return (this.page - 1) * this.pageSize;
  }
  get take(): number {
    return this.pageSize;
  }
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 统一分页结果包装 */
export function pageResult<T>(
  list: T[],
  total: number,
  dto: PaginationDto,
): PageResult<T> {
  return { list, total, page: dto.page, pageSize: dto.pageSize };
}
