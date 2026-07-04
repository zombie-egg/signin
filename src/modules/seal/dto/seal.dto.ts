import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ListSealDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: ['ENABLED', 'DISABLED'] })
  @IsIn(['ENABLED', 'DISABLED'])
  @IsOptional()
  status?: string;
}

export class CreateSealDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: ['COMPANY', 'LEGAL_PERSON', 'OTHER'], default: 'COMPANY' })
  @IsIn(['COMPANY', 'LEGAL_PERSON', 'OTHER'])
  @IsOptional()
  type: string = 'COMPANY';
}

export class UpdateSealStatusDto {
  @ApiProperty({ enum: ['ENABLED', 'DISABLED'] })
  @IsIn(['ENABLED', 'DISABLED'])
  status!: string;
}
