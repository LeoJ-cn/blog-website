/**
 * 逻辑判断
 */

import { find, filter } from 'lodash'
import { SimpleProcessData } from '../../../types/process';
import { BlockNames_DTS, TranslateNodeParams_DTS, AnchorTag_DTS, DescInfo_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'


/**
 * 翻译： 逻辑判断（等于，不等于，大于，小于，大于等于，小于等于）
 */
enum LogicOP_DTS {
  EQUAL = 'EQUAL', // 等于
  NOT_EQUAL = 'NOT_EQUAL', // 不等于
  MORE = 'MORE', // 大于
  MOREOREQUAL = 'MOREOREQUAL', // 大于等于
  LESS = 'LESS', // 小于
  LESSOREQUAL = 'LESSOREQUAL' // 小于等于
}


/**
 * 操作符转换
 */
const OP_MAP: Partial<Record<BlockNames_DTS, LogicOP_DTS>> = {
  [BlockNames_DTS.LOGIC_EQUAL_NODE]: LogicOP_DTS.EQUAL,
  [BlockNames_DTS.LOGIC_NOT_EQUAL_NODE]: LogicOP_DTS.NOT_EQUAL,
  [BlockNames_DTS.LOGIC_GREATER_NODE]: LogicOP_DTS.MORE,
  [BlockNames_DTS.LOGIC_GREATER_EQUAL_NODE]: LogicOP_DTS.MOREOREQUAL,
  [BlockNames_DTS.LOGIC_LESS_NODE]: LogicOP_DTS.LESS,
  [BlockNames_DTS.LOGIC_LESS_EQUAL_NODE]: LogicOP_DTS.LESSOREQUAL,
}


export class TranslateMathCompareNodeService extends TranslateBaseService {

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

    if (!preCarAnchor || !sufVarAnchor || !returnAnchor) {
      throw new Error('异常: 逻辑判断块没有配置“前值”“后值”或“返回值”锚点数据，请检查！！！')
    }

    // 翻译
    const OP = OP_MAP[method.type] || LogicOP_DTS.EQUAL;

    // 更新前值变量
    const preRecordData = method.map_FromAnchorToSourceNode[preCarAnchor.index]
    if (!preRecordData) throw new Error('异常: 逻辑判断块没有连接“前值”，请检查图表连线！！！')
    const A = this.createSimpleProcessData('variable', this.getParameterDependentVariable(preRecordData))

    // 更新前值变量
    const sufRecordData = method.map_FromAnchorToSourceNode[sufVarAnchor.index]
    if (!sufRecordData) throw new Error('异常: 逻辑判断块没有连接“后值”，请检查图表连线！！！')
    const B = this.createSimpleProcessData('variable', this.getParameterDependentVariable(sufRecordData))

    const andorSimpleProcessData = {
      id: this.generateUUID(),
      type: 'math_compare',
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
