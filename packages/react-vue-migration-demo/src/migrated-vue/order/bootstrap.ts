import { createApp, reactive } from 'vue'
import { migrationLog } from '../../shared/migration-log'
import VueOrderHost from './VueOrderHost.vue'
import type { ModuleInstance, MountOptions, OrderModuleProps } from './contract'

export function mountVueOrder(options: MountOptions): ModuleInstance {
  const reactiveProps = reactive<OrderModuleProps>({ ...options.props })
  let unmounted = false

  migrationLog.append({ source: 'Bridge', message: 'mount VueOrder' })
  const app = createApp(VueOrderHost, {
    moduleProps: reactiveProps,
    platform: options.platform,
    events: options.events,
  })
  app.mount(options.container)

  return {
    update(nextProps) {
      if (unmounted) {
        migrationLog.append({ source: 'Bridge', message: 'ignored update after unmount' })
        return
      }

      migrationLog.append({ source: 'Bridge', message: 'update props' })
      Object.assign(reactiveProps, nextProps)
    },
    unmount() {
      if (unmounted) return
      unmounted = true
      migrationLog.append({ source: 'Bridge', message: 'unmount' })
      app.unmount()
    },
  }
}
