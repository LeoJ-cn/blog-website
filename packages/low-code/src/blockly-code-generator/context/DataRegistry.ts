import type { Data } from '../../types/data'

/** 代码生成只读变量索引；同时兼容旧数据的 `id` 与 `uuid` 标识。 */
export class DataRegistry {
  private readonly records = new Map<string, Data>()

  public constructor(data: Data[] = []) {
    data.forEach((item) => {
      if (item.id) this.records.set(item.id, item)
      if (item.uuid) this.records.set(item.uuid, item)
    })
  }

  public get(identifier: string): Data | undefined {
    return this.records.get(identifier)
  }
}
