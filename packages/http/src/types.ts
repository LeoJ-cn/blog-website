import type { AxiosRequestConfig, AxiosResponse } from 'axios'

export interface HttpClientOptions { baseURL?: string; timeout?: number; headers?: AxiosRequestConfig['headers'] }
export interface HttpRequestConfig<D = unknown> extends AxiosRequestConfig<D> { skipErrorHandler?: boolean }
export type HttpResponse<T> = AxiosResponse<T>
export interface ApiErrorPayload { message?: string; code?: string; details?: unknown }
