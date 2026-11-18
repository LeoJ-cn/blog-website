import type { Connect, Plugin } from 'vite'
import { CATALOG_VERSION } from '../a2ui/catalog-meta'
import { messagesForRequest } from './fixtures'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => resolve(body))
  })
}

// 请求计数决定返回哪个阶段：0 默认 → 1 增量 → 2 清空 → 3 默认 → …
// 放在模块作用域，所以整轮 dev server 内连续累加，重启后归零。
let requestCount = 0

function chatHandler(): Connect.NextHandleFunction {
  return async (req, res) => {
    // 请求体除了触发，还携带前端当前是否已有 surface。
    // 刷新页面会丢掉前端内存里的 surface，但本进程的计数器不受影响；
    // 若继续按计数下发 update 批次，页面拿不到 createSurface，就会一直停在「等待生成…」。
    // 所以前端声明「没有 surface」时，强制从第 0 轮（含 createSurface）重来。
    const body = await readBody(req)
    let hasSurface = true
    try {
      hasSurface = JSON.parse(body)?.hasSurface !== false
    } catch {
      // 非法 body 时按「已有 surface」处理，保持原有行为
    }
    if (!hasSurface) requestCount = 0

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-A2UI-Version', CATALOG_VERSION)
    res.setHeader('X-A2UI-Hash', 'dev')

    const messages = messagesForRequest(requestCount)
    requestCount += 1

    // 逐条发送并留出间隔，页面上才看得出消息是一条条到的
    for (const message of messages) {
      res.write(`data: ${JSON.stringify(message)}\n\n`)
      await sleep(80)
    }
    res.write('data: [DONE]\n\n')
    res.end()
  }
}

const actionHandler: Connect.NextHandleFunction = (req, res) => {
  void readBody(req).then((body) => {
    // 这里能看到前端随 action 一起上送的最新数据模型，便于验证「点查看拿到的是当下状态」
    console.info('[a2ui mock] action', body)
    res.statusCode = 204
    res.end()
  })
}

export function mockApiPlugin(): Plugin {
  return {
    name: 'a2ui-mock-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/chat', chatHandler())
      server.middlewares.use('/api/action', actionHandler)
    },
  }
}
