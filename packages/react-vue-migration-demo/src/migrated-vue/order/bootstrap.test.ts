import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eventBus } from '../../shared/event-bus'
import { migrationLog } from '../../shared/migration-log'
import { mountVueOrder } from './bootstrap'

function createOptions(container: HTMLElement) {
  return {
    container,
    props: { orderId: '10001', readonly: false },
    platform: {
      router: {
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
      },
    },
    events: {
      success: vi.fn(),
      close: vi.fn(),
    },
  }
}

describe('mountVueOrder', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    migrationLog.clear()
  })

  afterEach(() => {
    container.remove()
    migrationLog.clear()
  })

  it('updates reactive props without remounting the Vue app', async () => {
    const instance = mountVueOrder(createOptions(container))
    await nextTick()
    const mountedRoot = container.firstElementChild

    instance.update({ orderId: '10002' })
    await nextTick()

    expect(container.firstElementChild).toBe(mountedRoot)
    expect(container.textContent).toContain('#10002')
    expect(
      migrationLog
        .getSnapshot()
        .filter((entry) => entry.source === 'Vue' && entry.message === 'mounted'),
    ).toHaveLength(1)
    expect(migrationLog.getSnapshot().map((entry) => entry.message)).toContain(
      'props changed 10001 → 10002',
    )

    instance.unmount()
  })

  it('unmounts once and rejects updates after teardown', async () => {
    const instance = mountVueOrder(createOptions(container))
    await nextTick()

    instance.unmount()
    instance.unmount()
    instance.update({ orderId: '10002' })

    expect(container.childElementCount).toBe(0)
    expect(
      migrationLog
        .getSnapshot()
        .filter((entry) => entry.source === 'Vue' && entry.message === 'unmounted'),
    ).toHaveLength(1)
    expect(migrationLog.getSnapshot().map((entry) => entry.message)).toContain(
      'ignored update after unmount',
    )
  })

  it('removes the Vue EventBus listener during unmount', async () => {
    const instance = mountVueOrder(createOptions(container))
    await nextTick()
    eventBus.emit('react:message', { orderId: '10001', message: 'before teardown' })
    await nextTick()
    const receivedBeforeUnmount = migrationLog
      .getSnapshot()
      .filter((entry) => entry.message.includes('received React EventBus'))

    instance.unmount()
    eventBus.emit('react:message', { orderId: '10001', message: 'after teardown' })
    await nextTick()

    expect(receivedBeforeUnmount).toHaveLength(1)
    expect(
      migrationLog
        .getSnapshot()
        .filter((entry) => entry.message.includes('received React EventBus')),
    ).toHaveLength(1)
  })
})
