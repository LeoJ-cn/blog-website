import { MessageProcessor } from './protocol'
import type { ActionPayload, ReactCatalogComponent } from './protocol'
import { APP_CATALOG } from './catalog'

// MessageProcessor 的构造函数签名是 Catalog<any>[]，无法从实参推断组件类型，
// 必须显式给出泛型参数，否则 T 退化为 ComponentApi，getSurfaces() 的返回类型
// 无法传给要求 SurfaceModel<ReactCatalogComponent> 的 A2uiSurface。
export const processor = new MessageProcessor<ReactCatalogComponent>(
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
