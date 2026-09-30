import cloneDeep from 'lodash/cloneDeep'
import type { INodeConfig, IPositon } from '../../interface'
import { LogicBlockBaseTplMap } from '../../service/const'
import type { BlockNames_DTS } from '../../service/interface'
import type { INodeConfigService } from './interface'
import type { OperationComponentTree } from '../../../types/edit-page'

/**
 * 原项目由 LogicNodeController 从后端 node_config 动态注入多数节点生成器。
 * 独立子包没有该后端时，使用同一份持久化节点模板恢复等价的本地生成能力。
 */
export class TemplateConfigService implements INodeConfigService {
  intro?: { zh_cn: string; en_us: string }
  operationTree?: OperationComponentTree | OperationComponentTree[]

  constructor(private readonly nodeType: BlockNames_DTS) {}

  getConfig(position: IPositon): INodeConfig {
    const template = LogicBlockBaseTplMap[this.nodeType]
    if (!template) throw new Error(`节点 ${this.nodeType} 缺少 LogicBlockBaseTplMap 模板`)

    const nodeId = `${+new Date() + (Math.random() * 10000).toFixed(0)}`
    const anchors = Object.values(cloneDeep(template.anchors)).map((anchor) => ({
      ...anchor,
      nodeId,
    }))

    return {
      id: nodeId,
      type: this.nodeType,
      label: template.label,
      x: position.x,
      y: position.y,
      data: { anchors },
    }
  }
}
