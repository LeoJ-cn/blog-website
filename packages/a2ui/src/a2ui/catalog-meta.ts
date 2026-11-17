// 只放纯字符串常量，不 import 任何东西。
// 原因：vite.config.ts 会在 Node 侧被加载，它会经 src/mock 反向依赖到这里；
// 若本文件 import 了 @a2ui/* 或 React 组件，Node 的 ESM 解析会因无扩展名导入而失败。
export const CATALOG_ID = 'https://leo.example/a2ui/catalog'
export const CATALOG_VERSION = '0.1.0'
