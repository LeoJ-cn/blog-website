import { useState } from 'react'
import { A2uiSurface } from '../a2ui/protocol'
import { useChat } from './useChat'
import { Sidebar } from './Sidebar'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { LibraryDemo } from './LibraryDemo'
import { BuiltinDemo } from './BuiltinDemo'
import './ChatPage.css'

/**
 * 三个演示页，对应组件复用的三种形态：
 *   library    —— @white55/a2ui-ui 作为普通 React 组件库直接用
 *   builtin    —— A2UI basic catalog 的原生 Web Component
 *   integrated —— 我们的组件经适配层接入 A2UI 后渲染
 * library 与 integrated 用的是同一批组件，可对照样式是否一致。
 */
type DemoMode = 'library' | 'builtin' | 'integrated'

const TABS: { mode: DemoMode; label: string }[] = [
  { mode: 'library', label: '作为 UI 组件库单独使用' },
  { mode: 'builtin', label: 'A2UI 自带组件' },
  { mode: 'integrated', label: 'A2UI 接入组件库的组件' },
]

export function ChatPage() {
  const [mode, setMode] = useState<DemoMode>('library')
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

        <div className="chat-surface">
          {mode === 'library' && <LibraryDemo />}
          {mode === 'builtin' && <BuiltinDemo />}
          {mode === 'integrated' &&
            (surfaces.length === 0 ? (
              <p className="chat-surface__empty">等待生成…</p>
            ) : (
              surfaces.map((surface) => (
                <A2uiSurface key={surface.id} surface={surface} />
              ))
            ))}
        </div>
      </main>
    </div>
  )
}
