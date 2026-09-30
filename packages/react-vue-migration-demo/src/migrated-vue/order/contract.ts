import type { MigrationPlatform } from '../../migration/platform'

export interface OrderModuleProps {
  orderId: string
  readonly: boolean
}

export interface OrderSuccessPayload {
  orderId: string
  message: string
}

export interface OrderModuleEvents {
  success(payload: OrderSuccessPayload): void
  close(): void
}

export interface MountOptions {
  container: HTMLElement
  props: OrderModuleProps
  platform: MigrationPlatform
  events: OrderModuleEvents
}

export interface ModuleInstance {
  /** 合并变化字段；不会重新创建 Vue App。 */
  update(props: Partial<OrderModuleProps>): void
  /** 卸载 Vue App；重复调用保持幂等。 */
  unmount(): void
}
