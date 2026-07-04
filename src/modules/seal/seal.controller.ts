import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SealService } from './seal.service';
import {
  CreateSealDto,
  ListSealDto,
  UpdateSealStatusDto,
} from './dto/seal.dto';
import { CurrentUser, Permissions } from '../../common/decorators';
import { Audit } from '../../common/interceptors/audit.interceptor';

@ApiTags('企业印章')
@Controller('seals')
export class SealController {
  constructor(private readonly seal: SealService) {}

  @Get()
  @Permissions('seal:list')
  @ApiOperation({ summary: '印章列表' })
  list(@Query() dto: ListSealDto) {
    return this.seal.list(dto);
  }

  @Post()
  @Permissions('seal:upload')
  @Audit({ action: 'SEAL_UPLOAD', targetType: 'seal' })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传印章（透明PNG）' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  create(
    @Body() dto: CreateSealDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    return this.seal.create(dto, file, userId);
  }

  @Patch(':id/status')
  @Permissions('seal:update')
  @Audit({ action: 'SEAL_STATUS', targetType: 'seal' })
  @ApiOperation({ summary: '启用/禁用印章' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSealStatusDto) {
    return this.seal.updateStatus(id, dto);
  }

  @Delete(':id')
  @Permissions('seal:delete')
  @Audit({ action: 'SEAL_DELETE', targetType: 'seal' })
  @ApiOperation({ summary: '删除印章（软删除）' })
  remove(@Param('id') id: string) {
    return this.seal.remove(id);
  }

  @Get(':id/preview')
  @Permissions('seal:download')
  @ApiOperation({ summary: '预览/下载印章原图' })
  preview(@Param('id') id: string) {
    return this.seal.preview(id);
  }

  @Get(':id/usage')
  @Permissions('audit:list')
  @ApiOperation({ summary: '印章使用记录' })
  usage(@Param('id') id: string) {
    return this.seal.usage(id);
  }
}
