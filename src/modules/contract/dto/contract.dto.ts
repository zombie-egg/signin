import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ListContractDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  serialNo?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'PENDING_SIGN', 'SIGNED', 'VOIDED', 'ARCHIVED'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  signerName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  endDate?: string;
}

export class CreateContractDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  serialNo!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  remark?: string;
}

/** 单枚印章坐标（前端 top-left 原点，scale=1 像素空间） */
export class StampPlacementDto {
  @ApiProperty()
  @IsUUID()
  sealId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  page!: number;

  @ApiProperty()
  @IsNumber()
  posX!: number;

  @ApiProperty()
  @IsNumber()
  posY!: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  width!: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  height!: number;
}

export class StampContractDto {
  @ApiProperty({ type: [StampPlacementDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StampPlacementDto)
  stamps!: StampPlacementDto[];
}
