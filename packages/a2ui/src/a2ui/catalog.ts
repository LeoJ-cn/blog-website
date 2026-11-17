import { Catalog, basicCatalog } from './protocol'
import type { ReactCatalogComponent } from './protocol'
import { A2uiButton } from './adapters/Button'
import { A2uiText } from './adapters/Text'
import { A2uiCard } from './adapters/Card'
import { A2uiTextField } from './adapters/TextField'
import { A2uiCheckBox } from './adapters/CheckBox'
import { A2uiChart } from './adapters/Chart'
import { A2uiOrderCard } from './adapters/OrderCard'

export { CATALOG_ID, CATALOG_VERSION } from './catalog-meta'

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

// 开发期校验两份清单一致。生产构建时 import.meta.env.DEV 为 false，整块被裁掉。
if (import.meta.env.DEV) {
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
