import axios, { type AxiosInstance } from 'axios'
import type { HttpClientOptions, HttpRequestConfig } from './types'
import { toHttpError } from './errors'

export function createHttpClient(options: HttpClientOptions = {}): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout ?? 10_000,
    headers: options.headers,
  })
  client.interceptors.request.use((config) => config)
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const config = error.config as HttpRequestConfig | undefined
      return Promise.reject(config?.skipErrorHandler ? error : toHttpError(error))
    },
  )
  return client
}

export const http = createHttpClient()
