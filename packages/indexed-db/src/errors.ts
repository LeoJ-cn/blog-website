import type { StorageErrorCode } from './types'

const DOM_ERROR_CODES: Readonly<Record<string, StorageErrorCode>> = {
  QuotaExceededError: 'QUOTA_EXCEEDED',
  AbortError: 'TRANSACTION_ABORTED',
  ConstraintError: 'CONSTRAINT_VIOLATION',
  DataCloneError: 'CLONE_FAILED',
}

export class KeyValueStorageError extends Error {
  readonly code: StorageErrorCode
  override readonly cause?: unknown

  constructor(code: StorageErrorCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options)
    this.name = 'KeyValueStorageError'
    this.code = code
    this.cause = options.cause
  }
}

/** 将底层异常转换为不包含业务 Value 内容的稳定存储错误。 */
export function toKeyValueStorageError(error: unknown): KeyValueStorageError {
  if (error instanceof KeyValueStorageError) return error

  const errorName = error instanceof Error ? error.name : ''
  const code = DOM_ERROR_CODES[errorName] ?? 'UNKNOWN'
  return new KeyValueStorageError(code, getSafeErrorMessage(code), { cause: error })
}

function getSafeErrorMessage(code: StorageErrorCode): string {
  switch (code) {
    case 'QUOTA_EXCEEDED':
      return '浏览器存储配额不足，Key-Value 写入失败'
    case 'TRANSACTION_ABORTED':
      return 'Key-Value 事务在完成前被中止'
    case 'CONSTRAINT_VIOLATION':
      return 'Key-Value 写入违反底层存储约束'
    case 'CLONE_FAILED':
      return 'Value 不满足浏览器 structured clone 协议'
    default:
      return 'Key-Value 存储操作失败'
  }
}
