import { useCallback, useEffect, useState } from 'react'
import type { A2uiMessage, ReactCatalogComponent, SurfaceModel } from '../a2ui/protocol'
import { processor } from '../a2ui/processor'
import { CATALOG_VERSION } from '../a2ui/catalog-meta'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export function useChat() {
  // 与 A2uiSurface 要求的 SurfaceModel<ReactCatalogComponent> 对齐，
  // 否则 render 时会因方差问题报类型错误。
  const [surfaces, setSurfaces] = useState<SurfaceModel<ReactCatalogComponent>[]>(() => [
    ...processor.getSurfaces().values(),
  ])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const sync = () => setSurfaces([...processor.getSurfaces().values()])
    const created = processor.onSurfaceCreated(sync)
    const deleted = processor.onSurfaceDeleted(sync)
    sync()
    return () => {
      created.unsubscribe()
      deleted.unsubscribe()
    }
  }, [])

  const send = useCallback(async (text: string) => {
    if (!text.trim()) return
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text }])
    setSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      const serverVersion = res.headers.get('X-A2UI-Version')
      if (serverVersion && serverVersion !== CATALOG_VERSION) {
        console.warn(`[a2ui] 版本不一致：前端 ${CATALOG_VERSION} / 后端 ${serverVersion}`)
      }

      if (!res.body) throw new Error('响应没有 body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let received = 0

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        const batch: A2uiMessage[] = []
        for (const raw of lines) {
          const line = (raw.startsWith('data:') ? raw.slice(5) : raw).trim()
          if (!line || line === '[DONE]') continue
          try {
            batch.push(JSON.parse(line) as A2uiMessage)
          } catch {
            // 不完整的行留给下一轮；这里跳过非法 JSON
          }
        }
        if (batch.length > 0) {
          processor.processMessages(batch)
          received += batch.length
        }
      }

      if (received > 0) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', text: '已生成界面' },
        ])
      }
    } catch (error) {
      console.error('[a2ui] 发送失败', error)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: '后端未接入：/api/chat 不可用。请确认本地 mock 中间件已启动。',
        },
      ])
    } finally {
      setSending(false)
    }
  }, [])

  return { messages, surfaces, send, sending }
}
