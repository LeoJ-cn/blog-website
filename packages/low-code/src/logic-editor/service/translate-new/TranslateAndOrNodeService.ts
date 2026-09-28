/**
 * 翻译： 逻辑运算（逻辑与， 逻辑或）
 */

import { find, filter } from 'lodash'
import { SimpleProcessData } from '../../../types/process';
import { BlockNames_DTS, TranslateNodeParams_DTS, AnchorTag_DTS, DescInfo_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'


enum LogicAndOrNodeOP_DTS {
  AND = 'ANDAND',
  OR = 'OROR'
}
export class TranslateAndOrNodeService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId)

    // 前值, 后值
    const [
      preCarAnchor,
      sufVarAnchor
    ] = filter(
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

    if (!preCarAnchor || !sufVarAnchor) {
      throw new Error('异常: 与/或的块  没有配置 ”前值“ “后值” 的锚点数据，请检查！！！')
    }

    // 翻译
    let A: SimpleProcessData; // 前
    let B: SimpleProcessData; // 后

    const OP = nodeInfo.type === BlockNames_DTS.LOGIC_AND_NODE ?
      LogicAndOrNodeOP_DTS.AND : LogicAndOrNodeOP_DTS.OR

    // 更新前值变量
    const preRecordData = method.map_FromAnchorToSourceNode[preCarAnchor.index]
    if (preRecordData) {
      const _var = this.getParameterDependentVariable(preRecordData)
      A = this.createSimpleProcessData('variable', _var)
    }

    // 更新后值变量
    const sufRecordData = method.map_FromAnchorToSourceNode[sufVarAnchor.index]
    if (sufRecordData) {
      const _var = this.getParameterDependentVariable(sufRecordData)
      B = this.createSimpleProcessData('variable', _var)
    }

    const andorSimpleProcessData = {
      id: this.generateUUID(),
      type: 'logic_compare',
      value: {
        A,
        B,
        OP,
      },
    }

    // 创建临时变量
    const {
      tempVarName,
      processData
    } = this.generateTempVar({ value: andorSimpleProcessData })

    // 存储“出参”的变量
    const varRecordKey = this.getVarRecordKey(returnAnchor.index)
    const varRecordVal = [tempVarName]
    this.setVar(method.nodeId, varRecordKey, varRecordVal) // 记录临时变量

    this.result = [processData];
  }
}



