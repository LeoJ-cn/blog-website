export function debounce<T extends (...args: never[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined

  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function throttle<T extends (...args: never[]) => void>(fn: T, interval: number) {
  let lastRun = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastRun < interval) return
    lastRun = now
    fn(...args)
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
