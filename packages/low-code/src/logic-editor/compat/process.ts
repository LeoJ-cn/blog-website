import type { Method } from '../../types/method'

let methodListProvider: () => Method[] = () => []

/** 注入旧运行时的可用方法列表，供方法调用节点保持原查询逻辑。 */
export function setMethodListProvider(provider: () => Method[]): void {
  methodListProvider = provider
}

export function getMethodList(): Method[] {
  return methodListProvider()
}
