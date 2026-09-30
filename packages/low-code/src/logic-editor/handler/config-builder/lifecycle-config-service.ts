import cloneDeep from 'lodash/cloneDeep'
import type { INodeConfig, IPositon } from '../../interface'
import { LogicBlockBaseTplMap } from '../../service/const'
import { BlockNames_DTS } from '../../service/interface'
import type { INodeConfigService } from './interface'

/** Web Playground 默认生命周期配置；宿主仍可通过 controller 注入平台专属定义覆盖。 */
export class LifecycleConfigService implements INodeConfigService {
  intro = {
    zh_cn: '将方法连接到生命周期输出分支，可在页面对应时机自动调用方法',
    en_us: 'Connect a method to a lifecycle output to invoke it at the corresponding page phase',
  }

  getConfig(position: IPositon): INodeConfig {
    const nodeId = BlockNames_DTS.LOGIC_LIFECYCLE_NODE
    const template = LogicBlockBaseTplMap[nodeId]
    const anchors = Object.values(cloneDeep(template.anchors)).map((anchor) => ({ ...anchor, nodeId }))
    return {
      id: nodeId,
      type: nodeId,
      x: position.x,
      y: position.y,
      data: { anchors },
    }
  }
}
