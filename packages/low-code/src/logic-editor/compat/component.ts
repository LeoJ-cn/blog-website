import type { ComponentTree } from '../../types/component'

/** 旧编辑器用于构造流程页模型的固定根节点，字段和值保持原实现。 */
export const ROOTCOMPONENT: ComponentTree[] = [
  {
    id: 0,
    parentId: -1,
    ins_id: '-1',
    tag: 'div',
    mini_method_uuid: '',
    data: {
      $style: {
        width: '100%',
        height: '100%',
      },
    },
    children: [],
  },
]

export interface ComponentRegistryAdapter {
  getComponents: () => unknown
  setComponents: (components: unknown, action: string) => void
}

let registry: ComponentRegistryAdapter = {
  getComponents: () => [],
  setComponents: () => undefined,
}

export function setComponentRegistryAdapter(adapter: ComponentRegistryAdapter): void {
  registry = adapter
}

export default {
  getComponents: () => registry.getComponents(),
  setComponents: (components: unknown, action: string) => registry.setComponents(components, action),
}
