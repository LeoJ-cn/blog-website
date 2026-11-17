import type { ChatMessage } from './useChat'

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="chat-messages">
      {messages.length === 0 ? (
        <p className="chat-empty">输入一句话开始生成界面</p>
      ) : (
        messages.map((m) => (
          <div key={m.id} className={`chat-message chat-message--${m.role}`}>
            {m.text}
          </div>
        ))
      )}
    </div>
  )
}
