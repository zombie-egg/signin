import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  @ApiProperty({ example: 'Init@123' })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  oldPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  newPassword!: string;
}
