/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 天地图浏览器端应用 Token；只允许通过本地环境或 CI Secret 注入。 */
  readonly VITE_TIANDITU_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}
