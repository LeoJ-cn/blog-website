import { normalizeDatabaseName } from '../internal/key'

type MemoryDatabaseRegistry = Map<string, Map<string, unknown>>

/** 页面生命周期内共享；关闭单个 Store 不应让其他同名实例丢失临时数据。 */
const memoryDatabaseRegistry: MemoryDatabaseRegistry = new Map()

export function getMemoryDatabase(databaseName: string): Map<string, unknown> {
  const normalizedName = normalizeDatabaseName(databaseName)
  const existingDatabase = memoryDatabaseRegistry.get(normalizedName)
  if (existingDatabase) return existingDatabase

  const database = new Map<string, unknown>()
  memoryDatabaseRegistry.set(normalizedName, database)
  return database
}
