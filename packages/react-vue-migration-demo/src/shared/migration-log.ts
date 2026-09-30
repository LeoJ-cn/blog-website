export type MigrationLogSource = 'React' | 'Bridge' | 'Vue' | 'React Platform'

export interface MigrationLogEntry {
  readonly id: string
  readonly source: MigrationLogSource
  readonly message: string
  /** 日志产生时间，单位为 Unix 毫秒。 */
  readonly timestamp: number
}

export interface MigrationLogInput {
  source: MigrationLogSource
  message: string
}

export interface MigrationLog {
  append(input: MigrationLogInput): MigrationLogEntry
  clear(): void
  getSnapshot(): readonly MigrationLogEntry[]
  subscribe(listener: (entries: readonly MigrationLogEntry[]) => void): () => void
}

export function createMigrationLog(): MigrationLog {
  let sequence = 0
  let entries: readonly MigrationLogEntry[] = Object.freeze([])
  const listeners = new Set<(entries: readonly MigrationLogEntry[]) => void>()

  const publish = () => {
    listeners.forEach((listener) => listener(entries))
  }

  return {
    append(input) {
      sequence += 1
      const entry = Object.freeze({
        id: `migration-log-${sequence}`,
        source: input.source,
        message: input.message,
        timestamp: Date.now(),
      })
      entries = Object.freeze([...entries, entry])
      publish()
      return entry
    },
    clear() {
      entries = Object.freeze([])
      publish()
    },
    getSnapshot() {
      return entries
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export const migrationLog = createMigrationLog()
