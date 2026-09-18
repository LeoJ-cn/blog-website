import type { BuildInfo } from '@blog/types'

export interface RuntimeConfig {
  apiBaseUrl: string
  wsUrl: string
  appEnv: 'development' | 'test' | 'staging' | 'production'
  buildTool: 'vite' | 'webpack'
  version: string
  commit: string
  isDev: boolean
  isProd: boolean
}

const mode = (import.meta.env?.MODE ?? 'development') as RuntimeConfig['appEnv']

export const env: RuntimeConfig = {
  apiBaseUrl: import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:3000',
  wsUrl: import.meta.env?.VITE_WS_URL ?? 'ws://localhost:3000',
  appEnv: mode,
  buildTool: 'vite',
  version: import.meta.env?.VITE_APP_VERSION ?? '2.0.0',
  commit: import.meta.env?.VITE_COMMIT_SHA ?? 'local',
  isDev: mode === 'development',
  isProd: mode === 'production',
}

export const buildInfo: BuildInfo = {
  version: env.version,
  buildTool: env.buildTool,
  mode: env.appEnv,
  commit: env.commit,
  buildTime: import.meta.env?.VITE_BUILD_TIME ?? 'local',
}
