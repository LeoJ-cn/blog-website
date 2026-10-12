import { KeyValueStorageError } from '../errors'

/**
 * 统一使用 structured clone 隔离存储边界，避免调用方通过对象引用绕过异步写入协议。
 */
export function cloneStoredValue<Value>(value: Value): Value {
  try {
    return structuredClone(value)
  } catch (error) {
    throw new KeyValueStorageError('CLONE_FAILED', 'Value 不满足 structured clone 协议', {
      cause: error,
    })
  }
}
