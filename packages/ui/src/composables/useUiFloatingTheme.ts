import { onMounted, readonly, shallowRef, type ShallowRef } from 'vue'

type UiThemeName = 'light' | 'dark'

/**
 * Teleport 会让浮层脱离局部主题 DOM，因此显示前需要从触发器重新解析主题并传给 Popper。
 * 未声明 data-ui-theme 的 .ui-theme 按浅色处理；找不到局部容器时回退到根节点主题。
 */
export function useUiFloatingTheme(anchor: Readonly<ShallowRef<HTMLElement | null>>) {
  const theme = shallowRef<UiThemeName>('light')

  function refreshTheme(): void {
    const localTheme = anchor.value?.closest<HTMLElement>('.ui-theme')
    const themeName = localTheme?.dataset.uiTheme ?? document.documentElement.dataset.uiTheme
    theme.value = themeName === 'dark' ? 'dark' : 'light'
  }

  onMounted(refreshTheme)

  const popperClass = shallowRef('ui-floating-theme--light')

  function refreshPopperTheme(): void {
    refreshTheme()
    popperClass.value = `ui-floating-theme--${theme.value}`
  }

  return {
    popperClass: readonly(popperClass),
    refreshTheme: refreshPopperTheme,
  }
}
