import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 统一响应格式接口
 */
export interface Response<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

/**
 * 统一响应拦截器
 * 将所有API响应转换为统一格式
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // 如果数据已经是统一格式，直接返回
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // 否则包装为统一格式
        return {
          success: true,
          data,
          message: '操作成功',
          timestamp: Date.now(),
        };
      }),
    );
  }
}
