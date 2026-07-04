import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArchiveService } from './archive.service';
import { ListContractDto } from '../contract/dto/contract.dto';
import { Permissions } from '../../common/decorators';
import { Audit } from '../../common/interceptors/audit.interceptor';

@ApiTags('归档审计')
@Controller('archive')
export class ArchiveController {
  constructor(private readonly archive: ArchiveService) {}

  @Get('contracts')
  @Permissions('archive:list')
  @ApiOperation({ summary: '归档合同筛选' })
  list(@Query() dto: ListContractDto) {
    return this.archive.list(dto);
  }

  @Get('contracts/:id/download')
  @Permissions('archive:download')
  @Audit({ action: 'ARCHIVE_DOWNLOAD', targetType: 'contract' })
  @ApiOperation({ summary: '下载归档件' })
  download(@Param('id') id: string) {
    return this.archive.download(id);
  }

  @Post('verify')
  @Permissions('archive:list')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传PDF校验是否被篡改' })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  verify(
    @Body('contractId') contractId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.archive.verify(contractId, file);
  }
}
