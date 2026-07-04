import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ContractService } from './contract.service';
import {
  CreateContractDto,
  ListContractDto,
  StampContractDto,
} from './dto/contract.dto';
import { CurrentUser, Permissions } from '../../common/decorators';
import { Audit } from '../../common/interceptors/audit.interceptor';

@ApiTags('合同管理')
@Controller('contracts')
export class ContractController {
  constructor(private readonly contract: ContractService) {}

  @Get()
  @Permissions('contract:list')
  @ApiOperation({ summary: '合同列表' })
  list(@Query() dto: ListContractDto) {
    return this.contract.list(dto);
  }

  @Post()
  @Permissions('contract:upload')
  @Audit({ action: 'CONTRACT_UPLOAD', targetType: 'contract' })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传合同（PDF）' })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  create(
    @Body() dto: CreateContractDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    return this.contract.create(dto, file, userId);
  }

  @Get(':id')
  @Permissions('contract:list')
  @ApiOperation({ summary: '合同详情' })
  detail(@Param('id') id: string) {
    return this.contract.detail(id);
  }

  @Get(':id/file')
  @Permissions('contract:download')
  @ApiOperation({ summary: '合同文件预签名URL' })
  file(@Param('id') id: string) {
    return this.contract.file(id);
  }

  @Post(':id/stamp')
  @Permissions('seal:use')
  @Audit({ action: 'SEAL_USE', targetType: 'contract' })
  @ApiOperation({ summary: '拖拽盖企业印章' })
  stamp(
    @Param('id') id: string,
    @Body() dto: StampContractDto,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    return this.contract.stamp(id, dto, userId, req);
  }

  @Post(':id/void')
  @Permissions('contract:void')
  @Audit({ action: 'CONTRACT_VOID', targetType: 'contract' })
  @ApiOperation({ summary: '作废合同' })
  void(@Param('id') id: string) {
    return this.contract.void(id);
  }

  @Delete(':id')
  @Permissions('contract:delete')
  @Audit({ action: 'CONTRACT_DELETE', targetType: 'contract' })
  @ApiOperation({ summary: '删除合同（软删除）' })
  remove(@Param('id') id: string) {
    return this.contract.remove(id);
  }
}
