import type {
  ModuleInstance,
  MountOptions,
  OrderModuleProps,
} from '../migrated-vue/order/contract'

export type VueOrderMount = (options: MountOptions) => ModuleInstance

export interface BridgeLifecycle {
  attach(options: MountOptions): void
  update(props: Partial<OrderModuleProps>): void
  detach(): void
}

export function createBridgeLifecycle(mount: VueOrderMount): BridgeLifecycle {
  let instance: ModuleInstance | null = null
  let currentProps: OrderModuleProps | null = null

  return {
    attach(options) {
      if (instance) return
      currentProps = { ...options.props }
      instance = mount(options)
    },
    update(nextProps) {
      if (!instance || !currentProps) return

      const changedProps = Object.fromEntries(
        Object.entries(nextProps).filter(
          ([key, value]) => !Object.is(currentProps?.[key as keyof OrderModuleProps], value),
        ),
      ) as Partial<OrderModuleProps>

      if (Object.keys(changedProps).length === 0) return
      Object.assign(currentProps, changedProps)
      instance.update(changedProps)
    },
    detach() {
      if (!instance) return
      instance.unmount()
      instance = null
      currentProps = null
    },
  }
}
