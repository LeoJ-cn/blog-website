import type { ReactNode } from 'react'

/**
 * 四段式页面骨架：
 *
 *   ┌───────────────── header（占满宽度）─────────────────┐
 *   ├───────────── 二级 header（占满宽度）───────────────┤
 *   ├──── 侧边栏 ────┬────────── 内容区 ──────────────────┤
 *   │  （含二级导航） │  （占据剩余空间，宽度自适应）        │
 *   └─────────────────┴──────────────────────────────────┘
 *
 * `contentFullscreen` 为真时，内容区盖住整页（含两个 header 与侧边栏），
 * 而不只是撑满下段——否则「全屏」还会被 header 占掉一条，名不副实。
 */
export function AppShell({
  header,
  subheader,
  sidebar,
  sidebarCollapsed = false,
  contentFullscreen = false,
  contentToolbar,
  children,
}: {
  header: ReactNode
  subheader: ReactNode
  sidebar: ReactNode
  /** 侧边栏收起时内容区要吃掉腾出来的宽度，所以宽度由这一层统一控制 */
  sidebarCollapsed?: boolean
  contentFullscreen?: boolean
  /** 全屏切换按钮等常驻操作，贴在内容区右上角 */
  contentToolbar?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={`app-shell${contentFullscreen ? ' app-shell--content-fullscreen' : ''}`}>
      <header className="app-header">{header}</header>
      <div className="app-subheader">{subheader}</div>
      <div className="app-body">
        <aside
          className={`app-sidebar app-sidebar--${sidebarCollapsed ? 'collapsed' : 'expanded'}`}
        >
          {sidebar}
        </aside>
        <main className="app-content">
          {contentToolbar && <div className="app-content__toolbar">{contentToolbar}</div>}
          {children}
        </main>
      </div>
    </div>
  )
}
