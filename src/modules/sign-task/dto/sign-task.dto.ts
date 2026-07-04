import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
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

export class ListTaskDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'SIGNED', 'REVOKED', 'EXPIRED'] })
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
}

/** 待签字段坐标（前端 top-left 原点） */
export class SignFieldDto {
  @ApiProperty({ enum: [2, 3], description: '2手写签名 3个人印章' })
  @IsInt()
  @IsIn([2, 3])
  fieldType!: number;

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

export class CreateTaskDto {
  @ApiProperty()
  @IsUUID()
  contractId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  signerName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  signerContact!: string;

  @ApiProperty({ description: 'ISO 时间，链接截止=有效期' })
  @IsDateString()
  deadline!: string;

  @ApiProperty({ type: [SignFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignFieldDto)
  fields!: SignFieldDto[];
}

export class RevokeTaskDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  reason!: string;
}
