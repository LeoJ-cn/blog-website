import { Catalog, basicCatalog } from './protocol'
import type { ReactCatalogComponent } from './protocol'
import { A2uiButton } from './adapters/A2uiButton'
import { A2uiText } from './adapters/A2uiText'
import { A2uiCard } from './adapters/A2uiCard'
import { A2uiTextField } from './adapters/A2uiTextField'
import { A2uiCheckBox } from './adapters/A2uiCheckBox'
import { A2uiChart } from './adapters/A2uiChart'
import { A2uiOrderCard } from './adapters/A2uiOrderCard'

export const CATALOG_ID = 'https://leo.example/a2ui/catalog'

// 与 basic catalog 同名、需要用自建实现替换的组件。
// Icon 不在其中：左侧固定区域不需要图标，右侧直接用 basic 的 Web Component 即可。
const OVERRIDDEN = new Set(['Text', 'Button', 'Card', 'TextField', 'CheckBox'])

const selfBuilt: ReactCatalogComponent[] = [
  A2uiText,
  A2uiButton,
  A2uiCard,
  A2uiTextField,
  A2uiCheckBox,
  A2uiChart,
  A2uiOrderCard,
]

/**
 * 校验 OVERRIDDEN 与 selfBuilt 两份清单是否互相印证。
 *
 * 任一处拼错都会导致「basic 里剔除了、自建里没补上」，页面上那个组件直接消失且不报错，
 * 因此把它暴露成显式函数，由应用在启动时调用；不在模块顶层自动执行，
 * 避免本包被迫依赖 Vite 的 import.meta.env 或 Node 的 process。
 */
export function assertCatalogConsistency(): void {
  const selfNames = new Set(selfBuilt.map((c) => c.name))
  for (const name of OVERRIDDEN) {
    if (!selfNames.has(name)) {
      throw new Error(`OVERRIDDEN 含 ${name}，但 selfBuilt 里没有同名实现`)
    }
  }
  for (const component of selfBuilt) {
    // 覆盖集合之外的自建组件若与 basic 重名，会被 Map.set 静默覆盖
    if (basicCatalog.components.has(component.name) && !OVERRIDDEN.has(component.name)) {
      throw new Error(`${component.name} 与 basic catalog 重名，但未加入 OVERRIDDEN`)
    }
  }
}

export const APP_CATALOG: Catalog<ReactCatalogComponent> = new Catalog<ReactCatalogComponent>(
  CATALOG_ID,
  '0.9',
  [
    // Map.values() 返回的是迭代器，不能直接 filter，先展开成数组
    ...[...basicCatalog.components.values()].filter((c) => !OVERRIDDEN.has(c.name)),
    ...selfBuilt,
  ],
  [...basicCatalog.functions.values()],
)
