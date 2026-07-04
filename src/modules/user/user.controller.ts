import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import {
  CreateUserDto,
  ListUserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
} from './dto/user.dto';
import { Permissions } from '../../common/decorators';
import { Audit } from '../../common/interceptors/audit.interceptor';

@ApiTags('用户与角色')
@Controller()
export class UserController {
  constructor(private readonly user: UserService) {}

  @Get('users')
  @Permissions('user:list')
  @ApiOperation({ summary: '用户列表' })
  list(@Query() dto: ListUserDto) {
    return this.user.list(dto);
  }

  @Post('users')
  @Permissions('user:create')
  @Audit({ action: 'USER_CREATE', targetType: 'user' })
  @ApiOperation({ summary: '新建用户' })
  create(@Body() dto: CreateUserDto) {
    return this.user.create(dto);
  }

  @Put('users/:id')
  @Permissions('user:update')
  @Audit({ action: 'USER_UPDATE', targetType: 'user' })
  @ApiOperation({ summary: '修改用户' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.user.update(id, dto);
  }

  @Patch('users/:id/status')
  @Permissions('user:update')
  @Audit({ action: 'USER_STATUS', targetType: 'user' })
  @ApiOperation({ summary: '启用/禁用用户' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.user.updateStatus(id, dto);
  }

  @Delete('users/:id')
  @Permissions('user:delete')
  @Audit({ action: 'USER_DELETE', targetType: 'user' })
  @ApiOperation({ summary: '删除用户（软删除）' })
  remove(@Param('id') id: string) {
    return this.user.remove(id);
  }

  @Get('roles')
  @Permissions('role:list')
  @ApiOperation({ summary: '角色列表' })
  roles() {
    return this.user.roles();
  }

  @Get('permissions/tree')
  @Permissions('role:list')
  @ApiOperation({ summary: '权限树' })
  permissionTree() {
    return this.user.permissionTree();
  }

  @Put('roles/:id/permissions')
  @Permissions('role:assign')
  @Audit({ action: 'ROLE_ASSIGN', targetType: 'role' })
  @ApiOperation({ summary: '配置角色权限' })
  assign(@Param('id') id: string, @Body('permissionIds') permissionIds: string[]) {
    return this.user.assignPermissions(id, permissionIds ?? []);
  }
}
