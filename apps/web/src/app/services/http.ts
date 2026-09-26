import { createHttpClient } from '@blog/http'
import { env } from '@blog/config'

/** 应用级 HTTP 客户端，统一复用运行时 API 地址与超时配置。 */
export const appHttp = createHttpClient({
  baseURL: env.apiBaseUrl,
})
