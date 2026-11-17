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
    // 请求体只用于触发；返回什么由它已经是第几次请求决定
    await readBody(req)

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
