/**
 * 翻译： 逻辑取反
 */

import { find } from 'lodash'
import { SimpleProcessData } from '../../../types/process';
import { TranslateNodeParams_DTS, AnchorTag_DTS, DescInfo_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'

export class TranslateNegationNodeService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId)

    // 数据源
    const varAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_INPUT,
        data: {
          _desc: DescInfo_DTS.VARIABLE
        }
      }
    )

    // 返回值
    const returnAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_OUTPUT
      }
    )

    if (!varAnchor || !returnAnchor) {
      throw new Error('异常: 逻辑取反块没有配置“入值”或“返回值”锚点数据，请检查！！！')
    }

    // 获取入值
    const recordData = method.map_FromAnchorToSourceNode[varAnchor.index]
    if (!recordData) throw new Error('异常: 逻辑取反块没有连接“入值”，请检查图表连线！！！')
    const inputVar = this.createSimpleProcessData('variable', this.getParameterDependentVariable(recordData))

    // 翻译取反
    const negationSimpleProcessData = {
      id: this.generateUUID(),
      type: 'block_not',
      value: {
        value: inputVar,
      },
    }

    // 创建临时变量存储
    const {
      tempVarName,
      processData
    } = this.generateTempVar({ value: negationSimpleProcessData })

    // 存储“出参”的变量
    const varRecordKey = this.getVarRecordKey(returnAnchor.index)
    const varRecordVal = [tempVarName]
    this.setVar(method.nodeId, varRecordKey, varRecordVal) // 记录临时变量

    this.result = [processData];
  }
}



