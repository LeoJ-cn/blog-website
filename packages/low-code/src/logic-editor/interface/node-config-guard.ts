import type { INodeConfig } from './index'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * 校验来自持久化数据、拖拽载荷或 G6 model 的节点是否满足内部核心协议。
 * 锚点成员的业务字段由对应节点构造器负责；此处只确认节点边界必需的容器结构。
 */
export function isNodeConfig(value: unknown): value is INodeConfig {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || value.id.trim() === '') return false
  if (typeof value.type !== 'string' || value.type.trim() === '') return false
  if (!isRecord(value.data)) return false
  return Array.isArray(value.data.anchors)
}

/** 在外部数据进入编辑器内部前完成协议收窄，并保留调用位置以便定位坏数据。 */
export function assertNodeConfig(value: unknown, context: string): asserts value is INodeConfig {
  if (!isNodeConfig(value)) {
    throw new TypeError(`${context}：节点必须包含非空 id、非空 type、对象 data 和数组 data.anchors`)
  }
}

