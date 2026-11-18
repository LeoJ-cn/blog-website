export * from './protocol'
export { CATALOG_ID, APP_CATALOG, assertCatalogConsistency } from './catalog'

// 自建组件（Leo 前缀）：与 basic catalog 并存，不覆盖任何标准组件
export { A2uiLeoText } from './adapters/A2uiLeoText'
export { A2uiLeoButton } from './adapters/A2uiLeoButton'
export { A2uiLeoCard } from './adapters/A2uiLeoCard'
export { A2uiLeoTextField } from './adapters/A2uiLeoTextField'
export { A2uiLeoCheckBox } from './adapters/A2uiLeoCheckBox'
export { A2uiLeoTabs } from './adapters/A2uiLeoTabs'
export { A2uiLeoModal } from './adapters/A2uiLeoModal'

// 业务组件
export { A2uiChart } from './adapters/A2uiChart'
export { A2uiOrderCard } from './adapters/A2uiOrderCard'
