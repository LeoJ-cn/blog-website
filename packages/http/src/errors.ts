import axios from 'axios'
import type { ApiErrorPayload } from './types'

export class HttpError extends Error {
  readonly status?: number
  readonly code?: string
  readonly details?: unknown

  constructor(message: string, payload: ApiErrorPayload = {}, status?: number) {
    super(message); this.name = 'HttpError'; this.status = status; this.code = payload.code; this.details = payload.details
  }
}

export function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const payload = error.response?.data ?? {}
    return new HttpError(payload.message ?? error.message, payload, error.response?.status)
  }
  return new HttpError(error instanceof Error ? error.message : 'Unknown HTTP error')
}
