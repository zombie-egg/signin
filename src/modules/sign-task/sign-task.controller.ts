import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SignTaskService } from './sign-task.service';
import { CreateTaskDto, ListTaskDto, RevokeTaskDto } from './dto/sign-task.dto';
import { CurrentUser, Permissions } from '../../common/decorators';
import { Audit } from '../../common/interceptors/audit.interceptor';

@ApiTags('签署任务')
@Controller('sign-tasks')
export class SignTaskController {
  constructor(private readonly task: SignTaskService) {}

  @Get()
  @Permissions('signtask:list')
  @ApiOperation({ summary: '签署任务列表' })
  list(@Query() dto: ListTaskDto) {
    return this.task.list(dto);
  }

  @Post()
  @Permissions('signtask:create')
  @Audit({ action: 'TASK_CREATE', targetType: 'sign_task' })
  @ApiOperation({ summary: '创建签署任务并生成一次性链接' })
  create(@Body() dto: CreateTaskDto, @CurrentUser('sub') userId: string) {
    return this.task.create(dto, userId);
  }

  @Get(':id')
  @Permissions('signtask:list')
  @ApiOperation({ summary: '任务详情' })
  detail(@Param('id') id: string) {
    return this.task.detail(id);
  }

  @Post(':id/revoke')
  @Permissions('signtask:revoke')
  @Audit({ action: 'TASK_REVOKE', targetType: 'sign_task' })
  @ApiOperation({ summary: '撤回任务' })
  revoke(@Param('id') id: string, @Body() dto: RevokeTaskDto) {
    return this.task.revoke(id, dto);
  }

  @Delete(':id')
  @Permissions('signtask:delete')
  @Audit({ action: 'TASK_DELETE', targetType: 'sign_task' })
  @ApiOperation({ summary: '删除签署任务（软删除）' })
  remove(@Param('id') id: string) {
    return this.task.remove(id);
  }

  @Get(':id/link')
  @Permissions('signtask:create')
  @ApiOperation({ summary: '查看签署链接' })
  link(@Param('id') id: string) {
    return this.task.link(id);
  }
}
