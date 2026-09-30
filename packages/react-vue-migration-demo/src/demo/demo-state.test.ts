import { describe, expect, it } from 'vitest'
import { createInitialDemoState, reduceDemoState } from './demo-state'

describe('demo state', () => {
  it('starts with the migrated Vue implementation on order 10001', () => {
    expect(createInitialDemoState()).toEqual({
      implementation: 'vue',
      orderId: '10001',
      routeError: null,
      receivedMessage: '尚未收到组件事件',
    })
  })

  it('preserves the current route while switching implementations', () => {
    const routed = reduceDemoState(createInitialDemoState(), {
      type: 'route-changed',
      path: '/orders/10002',
    })

    const legacy = reduceDemoState(routed, { type: 'implementation-selected', value: 'react' })

    expect(legacy.implementation).toBe('react')
    expect(legacy.orderId).toBe('10002')
  })

  it('stores success and close events received by React', () => {
    const succeeded = reduceDemoState(createInitialDemoState(), {
      type: 'success-received',
      message: 'Vue success - order 10001',
    })
    const closed = reduceDemoState(succeeded, { type: 'close-received' })

    expect(succeeded.receivedMessage).toBe('Vue success - order 10001')
    expect(closed.receivedMessage).toBe('Vue close')
  })

  it('reports an unknown route without discarding the last valid order', () => {
    const state = reduceDemoState(createInitialDemoState(), {
      type: 'route-changed',
      path: '/orders/not-supported',
    })

    expect(state.orderId).toBe('10001')
    expect(state.routeError).toBe('Unsupported order route: /orders/not-supported')
  })
})
