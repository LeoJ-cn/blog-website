# 应用运行时服务

## 目的

应用级运行时服务统一放在 `apps/web/src/app/services/`，页面和技术 Demo 不直接创建底层客户端。

## Runtime Config

共享配置位于 `@blog/config`：

- `env.apiBaseUrl`：HTTP API 地址
- `env.wsUrl`：WebSocket 地址
- `env.appEnv`：运行环境
- `buildInfo`：版本、构建工具、Commit 和构建时间

## HTTP

通过统一客户端发送请求：

```ts
import { appHttp } from '@/app/services'

const response = await appHttp.get('/health')
```

HTTP 客户端复用 Runtime Config 的 API 地址，并使用共享错误转换逻辑。

## WebSocket

通过统一客户端管理连接：

```ts
import { appWebSocket } from '@/app/services'

appWebSocket.on('message', (message) => {
  // 处理 Demo 自己的消息协议
})
appWebSocket.connect()
```

应用启动时不会自动建立 WebSocket 连接；具体功能必须显式调用 `connect()`，并在结束时调用 `close()`。

## Monitoring

应用入口负责启动 Monitoring，并在挂载后采集一次性能指标。技术 Demo 不应重复注册全局错误监听器；如需自定义指标，应通过 Reporter 扩展。
