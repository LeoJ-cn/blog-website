/**
 * 翻译： if-else 块
 */

import { filter, forEach } from 'lodash'
import { ControlsIfNode } from '../../runtime/ControlsIfNode';
import { SimpleProcessData } from '../../../types/process';
import { AnchorTag_DTS, TranslateNodeParams_DTS, SideQuests_DTS, DescInfo_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'


type IfElseBranches_DTS = Array<
  Array<Array<{
    a: string[];
    op: 'notNull'
  }>>
>

export class TranslateIfelseNodeService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId)

    const ifAnchorList = filter(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_INPUT,
        data: {
          _desc: DescInfo_DTS.IFELSE_IF
        }
      }
    )

    if (!ifAnchorList || !ifAnchorList.length) {
      throw new Error('异常： 请检查 if-else如果否则块  的锚点配置，没有匹配到if判断的_desc配置！！！')
    }

    // DO语句 以及 else语句
    const processData_value: Record<string, SimpleProcessData[]> = {
      // DO0, DO1, DO2, DO3 .... DON
      ELSE: this.workFlow2ProcessData({
        methodWorkFlow: method.sideQuests?.[SideQuests_DTS.IFELSE_ELSE]?.[0] || [],
        cache
      })
    };

    const branches: IfElseBranches_DTS = []
    forEach(ifAnchorList, (curAnchor, index) => {
      let _var: string[] = []
      const recordData = method.map_FromAnchorToSourceNode[curAnchor.index]
      if (!recordData) {
        console.warn(`异常: 如果否则（${method.nodeId}）没有指定  条件${index + 1} , 请检查图表连线！！！`)
      } else {
        _var = this.getParameterDependentVariable(recordData)
      }
      branches.push(
        [[{
          a: _var,
          op: 'notNull'
        }]]
      )

      // DO${N}  语句（sideQuests存储的顺序和if 一一对应）
      processData_value[`DO${index}`] = this.workFlow2ProcessData({
        methodWorkFlow: method.sideQuests?.[SideQuests_DTS.IFELSE_DO]?.[index] || [],
        cache
      })
    })

    const ControlsIfProcessData = new ControlsIfNode({
      attrs: {
        branches
      }
    }).generate()

    // 补充 do以及else语句
    if (ControlsIfProcessData && ControlsIfProcessData.length) {
      ControlsIfProcessData[0].value = {
        ...(ControlsIfProcessData[0].value || {}),
        ...processData_value
      }
    }

    this.result = ControlsIfProcessData;
  }
}


