/**
 * 自定义错误类 / カスタムエラークラス
 *
 * 统一的应用错误层次结构，用于结构化错误处理。
 * アプリケーション全体で使用する統一エラー階層。
 */

/** 基础应用错误 / ベースアプリケーションエラー */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: unknown,
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

/** 验证错误 / バリデーションエラー (400) */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

/** 未找到错误 / 未検出エラー (404) */
export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 404, 'NOT_FOUND', details)
  }
}

/** 冲突错误 / 競合エラー (409) */
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, 'CONFLICT', details)
  }
}

/** 未授权错误 / 未認証エラー (401) */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', details)
  }
}

/** 禁止访问错误 / アクセス禁止エラー (403) */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: unknown) {
    super(message, 403, 'FORBIDDEN', details)
  }
}
