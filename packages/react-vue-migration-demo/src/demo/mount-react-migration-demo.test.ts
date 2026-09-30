import { describe, expect, it, vi } from 'vitest'
import { createReactMigrationDemoMount } from './mount-react-migration-demo'

describe('mountReactMigrationDemo', () => {
  it('renders once and unmounts once through an idempotent disposer', () => {
    const root = { render: vi.fn(), unmount: vi.fn() }
    const rootFactory = vi.fn(() => root)
    const mount = createReactMigrationDemoMount(rootFactory)
    const container = document.createElement('div')

    const dispose = mount(container)
    dispose()
    dispose()

    expect(rootFactory).toHaveBeenCalledWith(container)
    expect(root.render).toHaveBeenCalledOnce()
    expect(root.unmount).toHaveBeenCalledOnce()
  })

  it('unmounts a created root when the initial render fails', () => {
    const renderError = new Error('React render failed')
    const root = {
      render: vi.fn(() => {
        throw renderError
      }),
      unmount: vi.fn(),
    }
    const mount = createReactMigrationDemoMount(() => root)

    expect(() => mount(document.createElement('div'))).toThrow(renderError)
    expect(root.unmount).toHaveBeenCalledOnce()
  })

  it('surfaces a root creation failure without attempting a render', () => {
    const rootError = new Error('React root failed')
    const mount = createReactMigrationDemoMount(() => {
      throw rootError
    })

    expect(() => mount(document.createElement('div'))).toThrow(rootError)
  })
})
