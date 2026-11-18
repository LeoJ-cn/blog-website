import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export type Theme = 'light' | 'dark'

/**
 * 主题状态与 URL 同步。
 *
 * 主题写在 `<html data-theme="...">` 上，而不是页面上某个容器：
 * 悬浮聊天窗是 position: fixed，会跳出普通容器的层叠上下文，
 * 挂在 html 上才能保证它和 A2UI 的 Web Component 读到同一套变量。
 *
 * URL 只在深色时带 `?theme=dark`，浅色是默认态，保持 URL 干净。
 */
export function useTheme() {
  const [searchParams, setSearchParams] = useSearchParams()
  const theme: Theme = searchParams.get('theme') === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggleTheme = useCallback(() => {
    const params = new URLSearchParams(searchParams)
    if (theme === 'dark') params.delete('theme')
    else params.set('theme', 'dark')
    // replace：换主题不该在浏览记录里堆一堆条目，后退键应回到上一个页面而不是上一个配色
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams, theme])

  return { theme, toggleTheme }
}
