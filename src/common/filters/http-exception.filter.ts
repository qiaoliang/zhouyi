import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * 统一异常过滤器
 * 捕获所有HTTP异常并返回统一格式的错误响应
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let error = {
      code: this.getErrorCode(status),
      message: exception.message || '请求失败',
    };

    // 处理验证错误
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as any;
      if (resp.message && Array.isArray(resp.message)) {
        error = {
          code: 'VALIDATION_ERROR',
          message: resp.message.join(', '),
        };
      }
    }

    response.status(status).json({
      success: false,
      error,
      timestamp: Date.now(),
    });
  }

  /**
   * 根据HTTP状态码获取错误码
   */
  private getErrorCode(status: number): string {
    const errorCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return errorCodes[status] || 'UNKNOWN_ERROR';
  }
}
