import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { SignService, SubmitItem } from './sign.service';
import { Public } from '../../common/decorators';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/constants/error-code';

/**
 * 签署端：无账号，token 即凭证。全部 @Public，靠 token 校验 + 严格限流。
 */
@ApiTags('签署端')
@Controller('sign')
export class SignController {
  constructor(private readonly sign: SignService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10次/分钟/IP
  @Get(':token')
  @ApiOperation({ summary: '校验链接并返回待签信息' })
  detail(@Param('token') token: string) {
    return this.sign.detail(token);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get(':token/file')
  @ApiOperation({ summary: '合同预览URL' })
  file(@Param('token') token: string) {
    return this.sign.file(token);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':token/submit')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '提交签名/印章，生成归档件' })
  @UseInterceptors(
    AnyFilesInterceptor({ limits: { fileSize: 5 * 1024 * 1024, files: 20 } }),
  )
  submit(
    @Param('token') token: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    const items = this.parseSubmit(files, req.body as Record<string, string>);
    return this.sign.submit(token, items, req);
  }

  /**
   * 解析 multipart：文本字段被解析为嵌套结构 body.signatures[i] = {fieldId, signType}，
   * 文件字段保留字面名 signatures[i][file]。二者按 index 合并。
   */
  private parseSubmit(
    files: Express.Multer.File[],
    body: Record<string, unknown>,
  ): SubmitItem[] {
    const byIndex = new Map<number, Partial<SubmitItem>>();

    // 文本字段：body.signatures 为数组（或对象，键为索引）
    const sigs = (body ?? {}).signatures as
      | Array<{ fieldId?: string; signType?: string }>
      | Record<string, { fieldId?: string; signType?: string }>
      | undefined;
    if (sigs) {
      const entries = Array.isArray(sigs)
        ? sigs.map((v, i) => [i, v] as const)
        : Object.entries(sigs).map(([k, v]) => [Number(k), v] as const);
      for (const [idx, v] of entries) {
        if (!v) continue;
        byIndex.set(idx, {
          fieldId: v.fieldId,
          signType: v.signType !== undefined ? Number(v.signType) : undefined,
        });
      }
    }

    // 文件字段：signatures[i][file]
    const fileRe = /^signatures\[(\d+)\]\[file\]$/;
    for (const f of files ?? []) {
      const m = fileRe.exec(f.fieldname);
      if (!m) continue;
      const idx = Number(m[1]);
      const cur = byIndex.get(idx) ?? {};
      cur.file = f;
      byIndex.set(idx, cur);
    }

    const items: SubmitItem[] = [];
    for (const [, v] of [...byIndex.entries()].sort((a, b) => a[0] - b[0])) {
      if (!v.fieldId || !v.file) {
        throw new BizException(ErrorCode.SIGN_FILE_INVALID);
      }
      items.push({
        fieldId: v.fieldId,
        signType: v.signType ?? 1,
        file: v.file,
      });
    }
    if (!items.length) throw new BizException(ErrorCode.SIGN_FILE_INVALID);
    return items;
  }
}
