import { describe, expect, it, vi } from 'vitest'
import type { Order } from '../../shared/api'
import { createOrderState } from './order-state'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
}

describe('createOrderState', () => {
  it('loads the requested order', async () => {
    const loader = vi.fn(async (orderId: string) => ({
      id: orderId,
      name: `Order ${orderId}`,
    }))
    const state = createOrderState(loader)

    await state.load('10001')

    expect(state.order.value).toEqual({ id: '10001', name: 'Order 10001' })
    expect(state.loading.value).toBe(false)
    expect(state.error.value).toBeNull()
  })

  it('ignores a stale response after the route changes', async () => {
    const first = deferred<Order>()
    const second = deferred<Order>()
    const loader = vi
      .fn<(orderId: string, signal: AbortSignal) => Promise<Order>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const state = createOrderState(loader)

    const firstLoad = state.load('10001')
    const secondLoad = state.load('10002')
    second.resolve({ id: '10002', name: 'Order 10002' })
    await secondLoad
    first.resolve({ id: '10001', name: 'Order 10001' })
    await firstLoad

    expect(state.order.value).toEqual({ id: '10002', name: 'Order 10002' })
  })

  it('does not expose an abort as a business error', async () => {
    const loader = vi.fn(async (_orderId: string, signal: AbortSignal) => {
      await new Promise<void>((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => reject(new DOMException('Order request aborted', 'AbortError')),
          { once: true },
        )
      })
      return { id: 'never', name: 'never' }
    })
    const state = createOrderState(loader)

    const firstLoad = state.load('10001')
    const secondLoad = state.load('10002')
    state.dispose()
    await Promise.all([firstLoad, secondLoad])

    expect(state.error.value).toBeNull()
  })

  it('exposes a regular loader rejection', async () => {
    const loader = vi.fn(async () => {
      throw new Error('network unavailable')
    })
    const state = createOrderState(loader)

    await state.load('10001')

    expect(state.error.value).toBe('network unavailable')
    expect(state.loading.value).toBe(false)
  })
})
