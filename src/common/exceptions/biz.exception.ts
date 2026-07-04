import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessage } from '../constants/error-code';

/**
 * 统一业务异常。抛出后由 AllExceptionsFilter 转成标准响应体。
 * 用法：throw new BizException(ErrorCode.SEAL_DISABLED)
 */
export class BizException extends HttpException {
  readonly bizCode: ErrorCode;

  constructor(bizCode: ErrorCode, message?: string, httpStatus?: HttpStatus) {
    const msg = message ?? ErrorMessage[bizCode] ?? '业务异常';
    super(msg, httpStatus ?? BizException.mapHttpStatus(bizCode));
    this.bizCode = bizCode;
  }

  /** 业务码映射到合适的 HTTP 状态码（前端以 bizCode 为准，HTTP 辅助） */
  private static mapHttpStatus(code: ErrorCode): HttpStatus {
    if (code >= 40100 && code < 40300) return HttpStatus.UNAUTHORIZED;
    if (code >= 40300 && code < 40400) return HttpStatus.FORBIDDEN;
    if (code === ErrorCode.RATE_LIMITED) return HttpStatus.TOO_MANY_REQUESTS;
    if (code === ErrorCode.NOT_FOUND || code === ErrorCode.TASK_NOT_FOUND)
      return HttpStatus.NOT_FOUND;
    if (code === ErrorCode.INTERNAL_ERROR) return HttpStatus.INTERNAL_SERVER_ERROR;
    return HttpStatus.BAD_REQUEST;
  }
}
