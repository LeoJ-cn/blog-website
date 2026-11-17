import type { Connect, Plugin } from 'vite'
import { CATALOG_VERSION } from '../a2ui/catalog-meta'
import { messagesFor } from './fixtures'

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

function chatHandler(): Connect.NextHandleFunction {
  return async (req, res) => {
    // 请求体只用于触发；当前 mock 固定返回复杂组件那一组消息
    await readBody(req)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-A2UI-Version', CATALOG_VERSION)
    res.setHeader('X-A2UI-Hash', 'dev')

    for (const message of messagesFor()) {
      res.write(`data: ${JSON.stringify(message)}\n\n`)
      await sleep(80)
    }
    res.write('data: [DONE]\n\n')
    res.end()
  }
}

const actionHandler: Connect.NextHandleFunction = (req, res) => {
  void readBody(req).then((body) => {
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
