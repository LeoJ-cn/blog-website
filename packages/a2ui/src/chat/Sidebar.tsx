import type { ReactNode } from 'react'

export function Sidebar({ children }: { children: ReactNode }) {
  return <aside className="chat-sidebar">{children}</aside>
}
