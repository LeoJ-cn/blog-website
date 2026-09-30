import mitt, { type Emitter, type Handler } from 'mitt'

export interface MigrationMessage {
  orderId: string
  message: string
}

export type MigrationEventMap = {
  /** React Shell 发给迁移后 Vue 模块的框架无关消息。 */
  'react:message': MigrationMessage
  /** 迁移后 Vue 模块发给 React Shell 的框架无关消息。 */
  'vue:message': MigrationMessage
}

export const eventBus: Emitter<MigrationEventMap> = mitt<MigrationEventMap>()

export function subscribeMigrationEvent<Key extends keyof MigrationEventMap>(
  type: Key,
  handler: Handler<MigrationEventMap[Key]>,
): () => void {
  eventBus.on(type, handler)

  return () => {
    eventBus.off(type, handler)
  }
}
