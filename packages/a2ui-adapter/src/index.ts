// 协议运行时与渲染器（升级或换渲染器只改 protocol.ts）
export * from './protocol'

// 已接入 UI 库的组件实现
export { A2uiButton } from './adapters/A2uiButton'
export { A2uiText } from './adapters/A2uiText'
export { A2uiCard } from './adapters/A2uiCard'
export { A2uiTextField } from './adapters/A2uiTextField'
export { A2uiCheckBox } from './adapters/A2uiCheckBox'
export { A2uiChart } from './adapters/A2uiChart'
export { A2uiOrderCard } from './adapters/A2uiOrderCard'

// 合并后的 catalog
export { APP_CATALOG, CATALOG_ID, assertCatalogConsistency } from './catalog'
