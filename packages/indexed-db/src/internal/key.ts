import { KeyValueStorageError } from '../errors'

/** namespace 与调用方 Key 的内部边界；namespace 禁止包含该字符。 */
export const KEY_SEPARATOR = '\u0000'

export function normalizeDatabaseName(value: string): string {
  return normalizeRequiredSegment(value, 'databaseName')
}

export function normalizeNamespace(value: string): string {
  const namespace = normalizeRequiredSegment(value, 'namespace')
  if (namespace.includes(KEY_SEPARATOR)) {
    throw new KeyValueStorageError('INVALID_KEY', 'namespace 不能包含内部 Key 分隔符')
  }
  return namespace
}

/** Caller Key 保留原始字符，仅拒绝非字符串和全部为空白的值。 */
export function validateCallerKey(key: string): string {
  if (typeof key !== 'string' || key.trim().length === 0) {
    throw new KeyValueStorageError('INVALID_KEY', 'Key 必须是非空字符串')
  }
  return key
}

export function toInternalKey(namespace: string, callerKey: string): string {
  return `${normalizeNamespace(namespace)}${KEY_SEPARATOR}${validateCallerKey(callerKey)}`
}

/** prefix 允许为空字符串，空 prefix 表示当前 namespace 的全部 Key。 */
export function toNamespacePrefix(namespace: string, callerPrefix = ''): string {
  if (typeof callerPrefix !== 'string') {
    throw new KeyValueStorageError('INVALID_KEY', 'Key prefix 必须是字符串')
  }
  return `${normalizeNamespace(namespace)}${KEY_SEPARATOR}${callerPrefix}`
}

export function fromInternalKey(namespace: string, internalKey: string): string {
  const namespacePrefix = toNamespacePrefix(namespace)
  if (!internalKey.startsWith(namespacePrefix)) {
    throw new KeyValueStorageError('INVALID_KEY', '内部 Key 不属于当前 namespace')
  }
  return internalKey.slice(namespacePrefix.length)
}

function normalizeRequiredSegment(value: string, label: 'databaseName' | 'namespace'): string {
  if (typeof value !== 'string') {
    throw new KeyValueStorageError('INVALID_KEY', `${label} 必须是字符串`)
  }
  const normalized = value.trim()
  if (!normalized) {
    throw new KeyValueStorageError('INVALID_KEY', `${label} 不能为空`)
  }
  return normalized
}
