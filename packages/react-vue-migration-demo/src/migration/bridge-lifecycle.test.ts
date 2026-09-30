import { describe, expect, it, vi } from 'vitest'
import type { MountOptions, ModuleInstance } from '../migrated-vue/order/contract'
import { createBridgeLifecycle } from './bridge-lifecycle'

function createOptions(container: HTMLElement, orderId = '10001'): MountOptions {
  return {
    container,
    props: { orderId, readonly: false },
    platform: {
      router: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
    },
    events: { success: vi.fn(), close: vi.fn() },
  }
}

describe('createBridgeLifecycle', () => {
  it('mounts once and sends prop changes to the existing instance', () => {
    const instance: ModuleInstance = { update: vi.fn(), unmount: vi.fn() }
    const mount = vi.fn(() => instance)
    const lifecycle = createBridgeLifecycle(mount)
    const options = createOptions(document.createElement('div'))

    lifecycle.attach(options)
    lifecycle.attach(options)
    lifecycle.update({ orderId: '10002' })
    lifecycle.update({ orderId: '10002' })

    expect(mount).toHaveBeenCalledOnce()
    expect(instance.update).toHaveBeenCalledOnce()
    expect(instance.update).toHaveBeenCalledWith({ orderId: '10002' })
  })

  it('keeps only one active instance across Strict Mode style re-entry', () => {
    const instances: ModuleInstance[] = []
    const mount = vi.fn(() => {
      const instance: ModuleInstance = { update: vi.fn(), unmount: vi.fn() }
      instances.push(instance)
      return instance
    })
    const lifecycle = createBridgeLifecycle(mount)
    const options = createOptions(document.createElement('div'))

    lifecycle.attach(options)
    lifecycle.detach()
    lifecycle.detach()
    lifecycle.attach(options)

    expect(mount).toHaveBeenCalledTimes(2)
    expect(instances[0]?.unmount).toHaveBeenCalledOnce()
    expect(instances[1]?.unmount).not.toHaveBeenCalled()
  })

  it('does not update a detached instance', () => {
    const instance: ModuleInstance = { update: vi.fn(), unmount: vi.fn() }
    const lifecycle = createBridgeLifecycle(() => instance)

    lifecycle.attach(createOptions(document.createElement('div')))
    lifecycle.detach()
    lifecycle.update({ orderId: '10002' })

    expect(instance.update).not.toHaveBeenCalled()
  })

  it('does not remount when an update repeats the current route props', () => {
    const instance: ModuleInstance = { update: vi.fn(), unmount: vi.fn() }
    const mount = vi.fn(() => instance)
    const lifecycle = createBridgeLifecycle(mount)
    const options = createOptions(document.createElement('div'))

    lifecycle.attach(options)
    lifecycle.update({ orderId: '10001', readonly: false })

    expect(mount).toHaveBeenCalledOnce()
    expect(instance.update).not.toHaveBeenCalled()
  })
})
