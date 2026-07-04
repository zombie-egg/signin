import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ListUserDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  username?: string;
}

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  realName?: string;

  @ApiProperty()
  @IsUUID()
  roleId!: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  realName?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({ description: '如需改密则传' })
  @IsString()
  @IsOptional()
  @MinLength(6)
  @MaxLength(64)
  password?: string;
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: [0, 1], description: '1启用 0禁用' })
  @IsIn([0, 1])
  status!: number;
}
