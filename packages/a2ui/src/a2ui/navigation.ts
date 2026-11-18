/**
 * A2UI 动作 → React Router 导航的桥接。
 *
 * 问题的本质：`processor` 在模块顶层创建，是 React 树之外的单例，
 * 拿不到 `useNavigate()`；而协议里的 action 只会上行到后端，
 * 没有「跳转」这个原语。所以需要一个模块级的函数槽位：
 * 由 React 侧在挂载时把 navigate 放进来，processor 侧在收到
 * 约定的动作名时调用它。
 *
 * 为什么不用事件总线：这里只有一个消费者（处理器）和一个生产者（React），
 * 槽位比事件系统少一层间接，也更容易看出「谁在什么时候注入」。
 */

/** action 里约定的跳转动作名。后端下发 `event.name: "navigate"` 即触发跳转。 */
export const NAVIGATE_ACTION = 'navigate'

type NavigateFn = (to: string) => void

let navigateFn: NavigateFn | null = null

/**
 * 由 ChatPage 在挂载时注入导航函数。
 *
 * 返回清理函数：路由容器卸载后必须摘掉，
 * 否则会继续调用已失效的 navigate（react-router 会直接抛错）。
 */
export function setNavigate(fn: NavigateFn): () => void {
  navigateFn = fn
  return () => {
    // 只在当前槽位仍是我们注入的那个时才清空，
    // 避免重建时的时序问题把新注入的函数误清掉。
    if (navigateFn === fn) navigateFn = null
  }
}

/**
 * 执行跳转。
 *
 * 未注入导航函数时返回 false，调用方据此决定是否退回「发给后端」的默认行为。
 */
export function navigateTo(to: string): boolean {
  if (!navigateFn) return false
  navigateFn(to)
  return true
}
