import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';
import { BizException } from '../exceptions/biz.exception';
import { ErrorCode, ErrorMessage } from '../constants/error-code';

/** 全局异常拦截，统一输出 { code, message, data, traceId } */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const traceId = (req.headers['x-request-id'] as string) ?? undefined;

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let bizCode: number = ErrorCode.INTERNAL_ERROR;
    let message: string = ErrorMessage[ErrorCode.INTERNAL_ERROR];

    if (exception instanceof BizException) {
      httpStatus = exception.getStatus();
      bizCode = exception.bizCode;
      message = exception.message;
    } else if (exception instanceof ThrottlerException) {
      httpStatus = HttpStatus.TOO_MANY_REQUESTS;
      bizCode = ErrorCode.RATE_LIMITED;
      message = ErrorMessage[ErrorCode.RATE_LIMITED];
    } else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const resp = exception.getResponse();
      // class-validator 校验错误
      if (typeof resp === 'object' && resp !== null && 'message' in resp) {
        const m = (resp as { message: string | string[] }).message;
        message = Array.isArray(m) ? m.join('; ') : m;
      } else {
        message = typeof resp === 'string' ? resp : exception.message;
      }
      bizCode =
        httpStatus === HttpStatus.BAD_REQUEST
          ? ErrorCode.PARAM_INVALID
          : httpStatus === HttpStatus.UNAUTHORIZED
            ? ErrorCode.UNAUTHORIZED
            : httpStatus === HttpStatus.FORBIDDEN
              ? ErrorCode.FORBIDDEN
              : ErrorCode.INTERNAL_ERROR;
    } else {
      // 未预期异常：记录堆栈，对外不泄露细节
      this.logger.error(
        `Unhandled: ${(exception as Error)?.message}`,
        (exception as Error)?.stack,
      );
    }

    res.status(httpStatus).json({
      code: bizCode,
      message,
      data: null,
      traceId,
    });
  }
}
