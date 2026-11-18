import { Catalog, basicCatalog } from './protocol'
import type { ReactCatalogComponent } from './protocol'
import { A2uiLeoText } from './adapters/A2uiLeoText'
import { A2uiLeoButton } from './adapters/A2uiLeoButton'
import { A2uiLeoCard } from './adapters/A2uiLeoCard'
import { A2uiLeoTextField } from './adapters/A2uiLeoTextField'
import { A2uiLeoCheckBox } from './adapters/A2uiLeoCheckBox'
import { A2uiLeoTabs } from './adapters/A2uiLeoTabs'
import { A2uiLeoModal } from './adapters/A2uiLeoModal'
import { A2uiChart } from './adapters/A2uiChart'
import { A2uiOrderCard } from './adapters/A2uiOrderCard'

export const CATALOG_ID = 'https://leo.example/a2ui/catalog'

/**
 * 我们自建的组件。
 *
 * 命名规则：与 `@white55/a2ui-ui` 的 React 组件同名（Leo 前缀）。
 * 这样后端看到 `LeoButton` 就知道它对应组件库里的哪个实现，
 * 不会与 basic catalog 的同名组件混淆。
 */
const selfBuilt: ReactCatalogComponent[] = [
  A2uiLeoText,
  A2uiLeoButton,
  A2uiLeoCard,
  A2uiLeoTextField,
  A2uiLeoCheckBox,
  A2uiLeoTabs,
  A2uiLeoModal,
  A2uiChart,
  A2uiOrderCard,
]

/**
 * 校验自建组件与 basic catalog 不重名。
 *
 * 本项目采用「只新增、不覆盖」策略：basic catalog 的组件全部原样保留，
 * 我们自己的组件一律用 Leo/Custom 前缀。一旦出现重名，Catalog 内部的 Map.set
 * 会静默覆盖其中一个，页面上表现为组件渲染成预期外的样子且没有报错，
 * 因此把这个约束显式化成启动期断言。
 *
 * 不在模块顶层自动执行：本包不应被迫依赖 Vite 的 import.meta.env 或 Node 的 process。
 */
export function assertCatalogConsistency(): void {
  for (const component of selfBuilt) {
    if (basicCatalog.components.has(component.name)) {
      throw new Error(
        `${component.name} 与 basic catalog 重名。本项目只新增、不覆盖，请改用带前缀的名字。`,
      )
    }
  }
}

export const APP_CATALOG: Catalog<ReactCatalogComponent> = new Catalog<ReactCatalogComponent>(
  CATALOG_ID,
  '0.9',
  [
    // basic 原样全保留：后端可以继续用标准组件
    ...basicCatalog.components.values(),
    ...selfBuilt,
  ],
  [...basicCatalog.functions.values()],
)
