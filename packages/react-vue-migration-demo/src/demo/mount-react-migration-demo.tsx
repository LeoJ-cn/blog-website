import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { ReactMigrationDemo } from './ReactMigrationDemo'

export interface ReactRootHandle {
  render(children: ReactNode): void
  unmount(): void
}

export type ReactRootFactory = (container: HTMLElement) => ReactRootHandle

export function createReactMigrationDemoMount(rootFactory: ReactRootFactory) {
  return (container: HTMLElement): (() => void) => {
    const root = rootFactory(container)
    let unmounted = false

    try {
      root.render(<ReactMigrationDemo />)
    } catch (reason) {
      root.unmount()
      throw reason
    }

    return () => {
      if (unmounted) return
      unmounted = true
      root.unmount()
    }
  }
}

export const mountReactMigrationDemo = createReactMigrationDemoMount(createRoot)
