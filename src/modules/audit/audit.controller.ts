import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService, ListAuditDto } from './audit.service';
import { Permissions } from '../../common/decorators';

@ApiTags('审计日志')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Permissions('audit:list')
  @ApiOperation({ summary: '操作日志查询' })
  list(@Query() dto: ListAuditDto) {
    return this.audit.list(dto);
  }
}
