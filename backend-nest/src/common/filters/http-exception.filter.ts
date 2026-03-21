// グローバル例外フィルター / 全局异常过滤器
// WmsException 対応 + 統一エラーレスポンス形式
// WmsException 支持 + 统一错误响应格式
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { WmsException } from '../exceptions/wms.exception.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let code: string | undefined;
    let details: unknown = null;

    if (exception instanceof WmsException) {
      // WMS 固有エラーコード付き / WMS特有错误代码
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message = res.message || message;
      code = res.code || exception.errorCode;
      details = res.details || null;
      error = exception.name;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else {
        message = (res as any).message || message;
        details = (res as any).details || null;
      }
      error = (res as any).error || exception.name;
    } else if (exception instanceof Error) {
      message = exception.message;
      // 本番では内部エラー詳細を隠す / 生产环境隐藏内部错误详情
      if (process.env.NODE_ENV === 'production') {
        message = 'Internal server error';
      }
    }

    // エラーログ出力（500系のみ） / 输出错误日志（仅500系列）
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      ...(code ? { code } : {}),
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
