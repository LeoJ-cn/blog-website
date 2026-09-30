import type { ReactNode } from 'react'
import { createRoot, type RootOptions } from 'react-dom/client'
import { ReactMigrationDemo } from './ReactMigrationDemo'

export interface ReactRootHandle {
  render(children: ReactNode): void
  unmount(): void
}

export type ReactRootFactory = (container: HTMLElement, options?: RootOptions) => ReactRootHandle

export interface ReactMigrationDemoMountOptions {
  onError?(error: unknown): void
}

export function createReactMigrationDemoMount(rootFactory: ReactRootFactory) {
  return (
    container: HTMLElement,
    options: ReactMigrationDemoMountOptions = {},
  ): (() => void) => {
    let root: ReactRootHandle | null = null
    let unmounted = false

    const dispose = () => {
      if (unmounted) return
      unmounted = true
      root?.unmount()
    }

    root = rootFactory(container, {
      onUncaughtError(error) {
        options.onError?.(error)
        // React 在提交阶段报告未捕获错误；推迟清理可避免在仍在渲染时同步卸载 Root。
        queueMicrotask(dispose)
      },
    })

    try {
      root.render(<ReactMigrationDemo />)
    } catch (reason) {
      dispose()
      throw reason
    }

    return dispose
  }
}

export const mountReactMigrationDemo = createReactMigrationDemoMount(createRoot)
