import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, ChangePasswordDto } from './dto/auth.dto';
import { CurrentUser, JwtPayload, Public } from '../../common/decorators';
import { getClientIp } from '../../common/utils/client.util';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 登录 5次/分钟/IP，防暴力破解
  @Post('login')
  @ApiOperation({ summary: '登录' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto.username, dto.password, getClientIp(req));
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '刷新 access token' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: '登出' })
  async logout(@CurrentUser() user: JwtPayload) {
    await this.auth.logout(user.sub, user.jti);
    return { ok: true };
  }

  @Get('me')
  @ApiOperation({ summary: '当前用户信息与权限' })
  me(@CurrentUser('sub') userId: string) {
    return this.auth.me(userId);
  }

  @Post('change-password')
  @ApiOperation({ summary: '修改自己的密码' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.auth.changePassword(userId, dto.oldPassword, dto.newPassword);
    return { ok: true };
  }
}
