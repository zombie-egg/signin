import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import { ErrorCode } from '../constants/error-code';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  traceId?: string;
}

/** 统一成功响应包装。控制器直接返回 data，拦截器包成标准结构 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const req = context.switchToHttp().getRequest<Request>();
    const traceId = (req.headers['x-request-id'] as string) ?? undefined;

    return next.handle().pipe(
      map((data) => ({
        code: ErrorCode.SUCCESS,
        message: 'success',
        data,
        traceId,
      })),
    );
  }
}
