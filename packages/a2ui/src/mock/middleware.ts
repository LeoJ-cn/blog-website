import type { Connect, Plugin } from 'vite'
import { CATALOG_VERSION } from '../a2ui/catalog-meta'
import { incrementalMessages, mockMessages } from './fixtures'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function chatHandler(): Connect.NextHandleFunction {
  return async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-A2UI-Version', CATALOG_VERSION)
    res.setHeader('X-A2UI-Hash', 'dev')

    const all = [...mockMessages, ...incrementalMessages]
    for (const message of all) {
      res.write(`data: ${JSON.stringify(message)}\n\n`)
      await sleep(80)
    }
    res.write('data: [DONE]\n\n')
    res.end()
  }
}

const actionHandler: Connect.NextHandleFunction = (req, res) => {
  let body = ''
  req.on('data', (chunk) => {
    body += chunk
  })
  req.on('end', () => {
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
