import { MessageProcessor } from './protocol'
import type { ActionPayload } from './protocol'
import { APP_CATALOG } from './catalog'

export const processor = new MessageProcessor(
  [APP_CATALOG],
  (action: ActionPayload) => {
    // 后端未接入时只在控制台留痕，便于验证 action 链路
    console.info('[a2ui] action', action)
    void fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    }).catch(() => {
      console.warn('[a2ui] /api/action 不可用，action 未回传')
    })
  },
  { reportErrorsOnly: true },
)
