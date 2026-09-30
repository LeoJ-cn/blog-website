import type { InjectionKey } from 'vue'

export interface MigrationPlatform {
  router: {
    /** 请求 React Shell 导航到指定内部路径。 */
    push(path: string): void
    /** 请求 React Shell 替换当前内部路径，不新增历史记录。 */
    replace(path: string): void
    /** 请求 React Shell 返回 MemoryRouter 的上一条内部记录。 */
    back(): void
  }
}

export const migrationPlatformKey: InjectionKey<MigrationPlatform> = Symbol('MigrationPlatform')
