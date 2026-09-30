import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ReactMigrationDemo } from '../demo/ReactMigrationDemo'
import { migrationLog } from '../shared/migration-log'

const reactActEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = [...container.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${label}`)
  }
  return button
}

describe('ReactLoadVueOrder router integration', () => {
  let container: HTMLElement
  let root: Root

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    migrationLog.clear()
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    migrationLog.clear()
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = false
  })

  it('preserves Vue internal state and mounts once when React Router changes order', async () => {
    await act(async () => root.render(<ReactMigrationDemo />))
    await act(async () => findButton(container, '内部状态 +1').click())
    expect(container.textContent).toContain('internal count1')

    await act(async () => findButton(container, '10002').click())

    expect(container.textContent).toContain('Vue Order #10002')
    expect(container.textContent).toContain('internal count1')
    expect(
      migrationLog
        .getSnapshot()
        .filter((entry) => entry.source === 'Vue' && entry.message === 'mounted'),
    ).toHaveLength(1)
  })
})
