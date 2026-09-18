export type WebSocketStatus = 'idle' | 'connecting' | 'open' | 'closing' | 'closed' | 'error'

export interface WebSocketClientOptions {
  reconnect?: boolean
  reconnectDelay?: number
  maxReconnectAttempts?: number
}

export interface WebSocketState {
  status: WebSocketStatus
  reconnectAttempts: number
}
