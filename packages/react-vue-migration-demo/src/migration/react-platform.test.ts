import type { NavigateFunction } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createReactMigrationPlatform } from './react-platform'

describe('createReactMigrationPlatform', () => {
  it('maps push to a React Router navigation', () => {
    const navigate = vi.fn() as unknown as NavigateFunction
    const platform = createReactMigrationPlatform(navigate)

    platform.router.push('/orders/10002')

    expect(navigate).toHaveBeenCalledWith('/orders/10002')
  })

  it('maps replace without adding a history entry', () => {
    const navigate = vi.fn() as unknown as NavigateFunction
    const platform = createReactMigrationPlatform(navigate)

    platform.router.replace('/orders/10002')

    expect(navigate).toHaveBeenCalledWith('/orders/10002', { replace: true })
  })

  it('maps back to a negative history delta', () => {
    const navigate = vi.fn() as unknown as NavigateFunction
    const platform = createReactMigrationPlatform(navigate)

    platform.router.back()

    expect(navigate).toHaveBeenCalledWith(-1)
  })
})
