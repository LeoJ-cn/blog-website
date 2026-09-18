import { WebSocketClient } from '@blog/websocket'
import { env } from '@blog/config'

/** 应用级 WebSocket 客户端；由具体功能在需要时显式调用 connect。 */
export const appWebSocket = new WebSocketClient(env.wsUrl)
