import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../../common/decorators';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('站内提醒')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notify: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '提醒列表' })
  list(@CurrentUser('sub') userId: string, @Query() dto: PaginationDto) {
    return this.notify.list(userId, dto);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '未读数（红点）' })
  unread(@CurrentUser('sub') userId: string) {
    return this.notify.unreadCount(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: '标记已读' })
  read(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notify.markRead(userId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: '全部已读' })
  readAll(@CurrentUser('sub') userId: string) {
    return this.notify.markAllRead(userId);
  }
}
