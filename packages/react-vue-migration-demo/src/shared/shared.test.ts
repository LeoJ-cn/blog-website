import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getOrder } from './api'
import { eventBus, subscribeMigrationEvent } from './event-bus'
import { createMigrationLog } from './migration-log'
import { formatOrderId } from './utils'

describe('shared migration utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats an order id with a hash prefix', () => {
    expect(formatOrderId('10001')).toBe('#10001')
  })

  it('returns the requested order', async () => {
    const orderPromise = getOrder('10001')

    await vi.advanceTimersByTimeAsync(300)

    await expect(orderPromise).resolves.toEqual({ id: '10001', name: 'Order 10001' })
  })

  it('does not deliver events after listener cleanup', () => {
    const listener = vi.fn()
    const cleanup = subscribeMigrationEvent('react:message', listener)

    eventBus.emit('react:message', { orderId: '10001', message: 'first' })
    cleanup()
    eventBus.emit('react:message', { orderId: '10001', message: 'second' })

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith({ orderId: '10001', message: 'first' })
  })

  it('publishes immutable log snapshots in append order', () => {
    const log = createMigrationLog()
    const snapshots: string[][] = []
    const cleanup = log.subscribe((entries) => {
      snapshots.push(entries.map((entry) => entry.message))
    })

    log.append({ source: 'React', message: 'render order 10001' })
    log.append({ source: 'Bridge', message: 'mount VueOrder' })

    const exposedSnapshot = log.getSnapshot() as unknown as Array<{ message: string }>
    expect(() => exposedSnapshot.push({ message: 'external mutation' })).toThrow(TypeError)
    expect(log.getSnapshot().map((entry) => entry.message)).toEqual([
      'render order 10001',
      'mount VueOrder',
    ])
    expect(snapshots).toEqual([
      ['render order 10001'],
      ['render order 10001', 'mount VueOrder'],
    ])

    cleanup()
  })

  it('clears all migration log entries', () => {
    const log = createMigrationLog()
    log.append({ source: 'Vue', message: 'mounted' })

    log.clear()

    expect(log.getSnapshot()).toEqual([])
  })
})
