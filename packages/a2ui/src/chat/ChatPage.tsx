import { A2uiSurface } from '../a2ui/protocol'
import { useChat } from './useChat'
import { Sidebar } from './Sidebar'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import './ChatPage.css'

export function ChatPage() {
  const { messages, surfaces, send, sending } = useChat()

  return (
    <div className="chat-page">
      <Sidebar>
        <h1 className="chat-title">A2UI 测试</h1>
        <MessageList messages={messages} />
        <ChatInput onSend={send} disabled={sending} />
      </Sidebar>
      <main className="chat-surface">
        {surfaces.length === 0 ? (
          <p className="chat-surface__empty">等待生成…</p>
        ) : (
          surfaces.map((surface) => (
            <A2uiSurface key={surface.id} surface={surface} />
          ))
        )}
      </main>
    </div>
  )
}
