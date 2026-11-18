import { APP_CATALOG, MessageProcessor, assertCatalogConsistency } from './protocol'
import type { ActionPayload, ReactCatalogComponent } from './protocol'
import { NAVIGATE_ACTION, navigateTo } from './navigation'

// 开发期自检：OVERRIDDEN 与 selfBuilt 两份清单必须互相印证，
// 否则会出现「basic 里剔除了、自建里没补上」的静默缺组件。
if (import.meta.env.DEV) {
  assertCatalogConsistency()
}

/**
 * 当前所有打开的 surface 的数据模型快照。
 *
 * 只有在 createSurface 里声明了 `sendDataModel: true` 的 surface 才会被包含进来。
 * 拿的是「此刻」的值，所以能反映用户刚在表单里改过的内容，而不是初始数据。
 */
function currentDataModel(proc: MessageProcessor<ReactCatalogComponent>) {
  return proc.getRendererDataModel()
}

// MessageProcessor 的构造函数签名是 Catalog<any>[]，无法从实参推断组件类型，
// 必须显式给出泛型参数，否则 T 退化为 ComponentApi，getSurfaces() 的返回类型
// 无法传给要求 SurfaceModel<ReactCatalogComponent> 的 A2uiSurface。
export const processor = new MessageProcessor<ReactCatalogComponent>(
  [APP_CATALOG],
  (action: ActionPayload) => {
    // 路由跳转是纯前端行为：协议没有「跳转」原语，后端只能下发一个动作名。
    // 命中约定名且导航函数已注入时，本地完成跳转，不再上行——否则后端
    // 会收到一个它无法处理、也不该处理的 navigate 事件。
    if (action.name === NAVIGATE_ACTION) {
      const to = action.context?.to
      if (typeof to === 'string' && navigateTo(to)) {
        console.info('[a2ui] 本地跳转', to)
        return
      }
      // 目标缺失或导航未就绪时继续走默认上行，避免动作被静默吞掉
      console.warn('[a2ui] navigate 动作无法本地执行，按普通动作回传', action)
    }

    // action.context 里只有组件自己声明的静态参数；
    // 页面上的最新数据要靠 dataModel 单独带上，两者一起发给后端。
    const payload = {
      ...action,
      dataModel: currentDataModel(processor),
    }
    console.info('[a2ui] action', payload)

    void fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      console.warn('[a2ui] /api/action 不可用，action 未回传')
    })
  },
  { reportErrorsOnly: true },
)
