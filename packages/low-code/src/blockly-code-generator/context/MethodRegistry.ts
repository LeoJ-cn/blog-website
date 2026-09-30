import type { Method } from '../../types/method'

/** 代码生成只读方法索引，用稳定 ID 还原最终函数名与调用协议。 */
export class MethodRegistry {
  private readonly records = new Map<string, Method>()

  public constructor(methods: Method[] = []) {
    methods.forEach((method) => {
      if (method.id) this.records.set(method.id, method)
      if (method.uuid) this.records.set(method.uuid, method)
    })
  }

  public get(identifier: string): Method | undefined {
    return this.records.get(identifier)
  }
}
