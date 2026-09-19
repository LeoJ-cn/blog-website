import type { WebSocketClientOptions, WebSocketState } from './types'

type Listener<T> = (payload: T) => void

export class WebSocketClient {
  private socket?: WebSocket
  private reconnectTimer?: ReturnType<typeof setTimeout>
  private reconnectAttempts = 0
  private readonly listeners = new Map<string, Set<Listener<unknown>>>()
  private readonly options: Required<WebSocketClientOptions>
  private _state: WebSocketState = { status: 'idle', reconnectAttempts: 0 }

  constructor(
    private readonly url: string,
    options: WebSocketClientOptions = {},
  ) {
    this.options = { reconnect: true, reconnectDelay: 1000, maxReconnectAttempts: 5, ...options }
  }

  get state(): WebSocketState {
    return { ...this._state }
  }

  connect(): void {
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    )
      return
    this.updateState('connecting')
    this.socket = new WebSocket(this.url)
    this.socket.addEventListener('open', () => {
      this.reconnectAttempts = 0
      this.updateState('open')
      this.emit('open', undefined)
    })
    this.socket.addEventListener('message', (event) => this.emit('message', event.data))
    this.socket.addEventListener('error', (event) => {
      this.updateState('error')
      this.emit('error', event)
    })
    this.socket.addEventListener('close', (event) => {
      this.updateState('closed')
      this.emit('close', event)
      this.scheduleReconnect()
    })
  }

  close(code?: number, reason?: string): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.options.reconnect = false
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) return
    this.updateState('closing')
    this.socket.close(code, reason)
  }

  send(data: string | ArrayBuffer | Blob): void {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('WebSocket is not open')
    this.socket.send(data)
  }

  on<T>(event: string, listener: Listener<T>): () => void {
    const listeners = this.listeners.get(event) ?? new Set<Listener<unknown>>()
    listeners.add(listener as Listener<unknown>)
    this.listeners.set(event, listeners)
    return () => listeners.delete(listener as Listener<unknown>)
  }

  private emit<T>(event: string, payload: T): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload))
  }
  private updateState(status: WebSocketState['status']): void {
    this._state = { status, reconnectAttempts: this.reconnectAttempts }
    this.emit('state', this.state)
  }
  private scheduleReconnect(): void {
    if (!this.options.reconnect || this.reconnectAttempts >= this.options.maxReconnectAttempts)
      return
    this.reconnectAttempts += 1
    this.reconnectTimer = setTimeout(() => this.connect(), this.options.reconnectDelay)
  }
}
