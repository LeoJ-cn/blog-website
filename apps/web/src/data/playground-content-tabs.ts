export const PLAYGROUND_CONTENT_TAB_VISIBILITY = {
  source: false,
  compatibility: false,
} as const

/** 暂未对外开放的内容保留实现，仅由此处控制 Playground 标签入口是否展示。 */
export function isPlaygroundContentTabVisible(tabId: string): boolean {
  if (tabId === 'source') return PLAYGROUND_CONTENT_TAB_VISIBILITY.source
  if (tabId === 'compatibility') return PLAYGROUND_CONTENT_TAB_VISIBILITY.compatibility
  return true
}
