import { Navigate, NavLink, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { A2uiSurface } from '../a2ui/protocol'
import { AppShell } from '../app/AppShell'
import { useChat } from './useChat'
import { useTheme } from './useTheme'
import { Sidebar } from './Sidebar'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ChatDock } from './ChatDock'
import { LibraryDemo } from './LibraryDemo'
import { BuiltinDemo } from './BuiltinDemo'
import { CONTENT_TABS, PATH_LABEL } from './nav'
import './ChatPage.css'

/**
 * 页面骨架 + 路由。
 *
 * 路由结构（basename 为 /a2ui）：
 *   /library     组件库直接使用
 *   /builtin     A2UI 自带组件
 *   /integrated  A2UI 接入组件库的组件
 *   /protocol/*  协议能力说明（这些页面没有独立内容，统一落到聊天框演示）
 *
 * 全屏状态放 ?fullscreen=1，侧边栏折叠放 ?nav=collapsed，
 * 两者都在 URL 上，刷新与浏览器前进后退都能恢复。
 */
export function ChatPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const fullscreen = searchParams.get('fullscreen') === '1'
  const { theme, toggleTheme } = useTheme()
  const { messages, surfaces, send, sending } = useChat()

  // 聊天输入框的提示语按当前路由区分，否则在协议页仍会提示「生成接入组件」
  const dockMode = location.pathname === '/integrated'
    ? 'integrated'
    : location.pathname.startsWith('/protocol')
      ? 'protocol'
      : 'builtin'

  const toggleFullscreen = () => {
    const params = new URLSearchParams(searchParams)
    if (fullscreen) params.delete('fullscreen')
    else params.set('fullscreen', '1')
    // 用 push：用户按浏览器后退能退回退出全屏前的状态
    setSearchParams(params)
  }

  const title = PATH_LABEL[location.pathname] ?? 'A2UI Playground'

  return (
    <AppShell
      sidebarCollapsed={searchParams.get('nav') === 'collapsed'}
      contentFullscreen={fullscreen}
      contentToolbar={
        <button
          type="button"
          className="content-fullscreen-btn"
          onClick={toggleFullscreen}
          aria-pressed={fullscreen}
          title={fullscreen ? '退出全屏' : '内容区全屏'}
        >
          <span aria-hidden="true">{fullscreen ? '⤡' : '⤢'}</span>
          {fullscreen ? '退出全屏' : '全屏'}
        </button>
      }
      header={
        <div className="app-header__inner">
          <span className="app-header__mark" aria-hidden="true">
            AI
          </span>
          <span className="app-header__brand">A2UI Playground</span>
          <span className="app-header__sub">Agent 驱动的界面协议演示</span>
          <button
            type="button"
            className="app-header__theme"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
            title={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☾' : '☀'}</span>
            {theme === 'dark' ? '深色' : '浅色'}
          </button>
        </div>
      }
      subheader={
        /* 二级 header 只做定位，不放操作项；Tab 属于内容区 */
        <div className="app-subheader__inner">
          <span className="breadcrumb">组件展示</span>
          <span className="breadcrumb__sep" aria-hidden="true">
            /
          </span>
          <span className="breadcrumb--current">{title}</span>
        </div>
      }
      sidebar={<Sidebar />}
    >
      {/* Tab 属于内容区，跟随内容一起滚动，不占全局布局 */}
      <nav className="content-tabs" role="tablist" aria-label="演示内容">
        {CONTENT_TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            role="tab"
            aria-selected={location.pathname === tab.path}
            className={({ isActive }) =>
              `content-tab${isActive ? ' content-tab--active' : ''}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/library" replace />} />
          <Route path="/library" element={<LibraryDemo />} />
          <Route path="/builtin" element={<BuiltinDemo />} />
          <Route
            path="/integrated"
            element={
              surfaces.length === 0 ? (
                <p className="content__empty">等待生成…</p>
              ) : (
                surfaces.map((surface) => (
                  <A2uiSurface key={surface.id} surface={surface} />
                ))
              )
            }
          />
          {/* 协议页没有独立内容区，点了就打开聊天框演示对应能力 */}
          <Route
            path="/protocol/*"
            element={<p className="content__empty">该能力通过右下角 AI 对话演示</p>}
          />
          <Route path="*" element={<Navigate to="/library" replace />} />
        </Routes>
      </div>

      <ChatDock title="AI 对话">
        <MessageList messages={messages} />
        <ChatInput onSend={send} disabled={sending} mode={dockMode} />
      </ChatDock>
    </AppShell>
  )
}
