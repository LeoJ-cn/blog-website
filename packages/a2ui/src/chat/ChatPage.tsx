import { useState } from 'react'
import { A2uiSurface } from '../a2ui/protocol'
import { useChat } from './useChat'
import { Sidebar } from './Sidebar'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { BasicDemo } from './BasicDemo'
import './ChatPage.css'

/**
 * 两个演示页的对照关系：
 *   basic   —— 直接写 JSX 使用 @white55/a2ui-ui 的组件，不经 A2UI
 *   complex —— 全部组件由 A2UI 的 JSON 消息经适配层渲染
 * 两侧用的是同一批组件，用于验证两条使用路径的视觉与交互是否一致。
 */
type DemoMode = 'basic' | 'complex'

const TABS: { mode: DemoMode; label: string }[] = [
  { mode: 'basic', label: '基础组件展示' },
  { mode: 'complex', label: '复杂组件展示' },
]

export function ChatPage() {
  const [mode, setMode] = useState<DemoMode>('basic')
  const { messages, surfaces, send, sending } = useChat()

  return (
    <div className="chat-page">
      <Sidebar>
        <h1 className="chat-title">A2UI 测试</h1>
        <MessageList messages={messages} />
        <ChatInput onSend={send} disabled={sending} mode={mode} />
      </Sidebar>
      <main className="chat-main">
        <nav className="chat-tabs" role="tablist" aria-label="演示内容">
          {TABS.map((tab) => (
            <button
              key={tab.mode}
              type="button"
              role="tab"
              aria-selected={mode === tab.mode}
              className={`chat-tab${mode === tab.mode ? ' chat-tab--active' : ''}`}
              onClick={() => setMode(tab.mode)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {mode === 'basic' ? (
          <div className="chat-surface">
            <BasicDemo />
          </div>
        ) : (
          <div className="chat-surface">
            {surfaces.length === 0 ? (
              <p className="chat-surface__empty">
                当前为「复杂组件展示」，发送一条消息生成界面
              </p>
            ) : (
              surfaces.map((surface) => (
                <A2uiSurface key={surface.id} surface={surface} />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}
