import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Catalog } from '@a2ui/web_core/v0_9'
import { basicCatalog } from '@a2ui/web_core/v0_9/basic_catalog'
import { ChartApi } from '../src/components/Chart.api'
import { OrderCardApi } from '../src/components/OrderCard.api'

const CATALOG_ID = 'https://leo.example/a2ui/catalog'

// basic 组件是 WebComponentImplementation，自定义组件是只带 name + schema 的普通对象，
// 两者都满足 ComponentApi，无需类型断言。
const merged = new Catalog(
  CATALOG_ID,
  '0.9',
  [...basicCatalog.components.values(), ChartApi, OrderCardApi],
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
