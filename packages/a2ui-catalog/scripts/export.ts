import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Catalog } from '@a2ui/web_core/v0_9'
import { basicCatalog } from '@a2ui/web_core/v0_9/basic_catalog'
import { LeoTextApi } from '../src/components/LeoText.api'
import { LeoButtonApi } from '../src/components/LeoButton.api'
import { LeoCardApi } from '../src/components/LeoCard.api'
import { LeoTextFieldApi } from '../src/components/LeoTextField.api'
import { LeoCheckBoxApi } from '../src/components/LeoCheckBox.api'
import { LeoTabsApi } from '../src/components/LeoTabs.api'
import { LeoModalApi } from '../src/components/LeoModal.api'
import {
  LeoBarChartApi,
  LeoHBarChartApi,
  LeoLineChartApi,
  LeoAreaChartApi,
  LeoPieChartApi,
  LeoRingChartApi,
  LeoGaugeChartApi,
} from '../src/components/LeoChart.api'
import { LeoOrderCardApi } from '../src/components/LeoOrderCard.api'
import { LeoBadgeApi } from '../src/components/LeoBadge.api'
import { LeoStatCardApi } from '../src/components/LeoStatCard.api'
import { LeoLinkButtonApi } from '../src/components/LeoLinkButton.api'

const CATALOG_ID = 'https://leo.example/a2ui/catalog'

// basic 组件是 WebComponentImplementation，自定义组件是只带 name + schema 的普通对象，
// 两者都满足 ComponentApi，无需类型断言。
// 导出结果必须与 a2ui-adapter 的 APP_CATALOG 一致：basic 全部保留，自建组件另加。
const merged = new Catalog(
  CATALOG_ID,
  '0.9',
  [
    ...basicCatalog.components.values(),
    LeoTextApi,
    LeoButtonApi,
    LeoCardApi,
    LeoTextFieldApi,
    LeoCheckBoxApi,
    LeoTabsApi,
    LeoModalApi,
    LeoBarChartApi,
    LeoHBarChartApi,
    LeoLineChartApi,
    LeoAreaChartApi,
    LeoPieChartApi,
    LeoRingChartApi,
    LeoGaugeChartApi,
    LeoOrderCardApi,
    LeoBadgeApi,
    LeoStatCardApi,
    LeoLinkButtonApi,
  ],
  [...basicCatalog.functions.values()],
)

const json = JSON.stringify(merged.toJson(), null, 2)
const hash = createHash('sha256').update(json).digest('hex')

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'catalog.json'), json)
writeFileSync(
  join(outDir, 'VERSION'),
  JSON.stringify(
    {
      version: '0.1.0',
      hash: `sha256:${hash}`,
      protocolVersion: 'v0.9',
      generatedFrom: process.env.GIT_SHA ?? 'local',
    },
    null,
    2,
  ),
)

console.log(`catalog.json: ${json.length} bytes, hash sha256:${hash.slice(0, 12)}`)
