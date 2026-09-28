/**
 * 数学运算
 */

import { find, filter } from 'lodash'
import { SimpleProcessData } from '../../../types/process';
import { BlockNames_DTS, TranslateNodeParams_DTS, AnchorTag_DTS, DescInfo_DTS, ConstOrVariable_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'
import { DataType } from '../../../types/schema';

/**
 * 数学运算符
 */
enum MathArithmeticOP {
  ADD = 'ADD', // 加法
  MINUS = 'MINUS', // 减法
  MULTIPLY = 'MULTIPLY', // 乘法
  DIVIDE = 'DIVIDE', // 除法
  MODULUS = 'MODULUS', // 取余
}

/**
 * 操作符转换
 */
const OP_MAP = {
  [BlockNames_DTS.LOGIC_ADDITION_NODE]: MathArithmeticOP.ADD,
  [BlockNames_DTS.LOGIC_SUBTRACTION_NODE]: MathArithmeticOP.MINUS,
  [BlockNames_DTS.LOGIC_MULTIPLICATION_NODE]: MathArithmeticOP.MULTIPLY,
  [BlockNames_DTS.LOGIC_DIVISION_NODE]: MathArithmeticOP.DIVIDE,
  [BlockNames_DTS.LOGIC_REMAINDER_NODE]: MathArithmeticOP.MODULUS,
}

export class TranslateMathArithmeticBasicService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const result: SimpleProcessData[] = []

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
      throw new Error('异常: “加减乘除取余”数学运算块 没有配置”前值“ “后值”的锚点数据 ，请检查！！！')
    }

    // 翻译
    let A: SimpleProcessData; // 前
    let B: SimpleProcessData; // 后
    let OP = OP_MAP[method.type] || MathArithmeticOP.ADD;


    /**
     * 前值：连线变量 或者  节点配置
     */
    const config_constOrVariable = preCarAnchor.data.constOrVariable || ConstOrVariable_DTS.USE_VARIABLE
    // 变量
    if (config_constOrVariable === ConstOrVariable_DTS.USE_VARIABLE) {
      const recordData = method.map_FromAnchorToSourceNode[preCarAnchor.index]
      if (!recordData) {
        console.warn(`异常: 数学运算块 没有指定参数 “数组”, 请检查图表连线！！！`)
      } else {
        // 获取参数依赖的变量
        const _var = this.getParameterDependentVariable(recordData)
        A = this.createSimpleProcessData('variable', _var)
      }
    } else {
      // 节点配置
      const _source = preCarAnchor.data.value || '1'
      const userInput = this.generateCodeBlock(_source, DataType.Number)
      const { tempVarName, processData } = this.generateTempVar({ value: userInput })
      result.push(processData)
      A = this.createSimpleProcessData('variable', [tempVarName])
    }


    /**
     * 后值：连线变量 或者  节点配置
     */
    const suf_config_constOrVariable = sufVarAnchor.data.constOrVariable || ConstOrVariable_DTS.USE_VARIABLE
    // 变量
    if (suf_config_constOrVariable === ConstOrVariable_DTS.USE_VARIABLE) {
      const recordData = method.map_FromAnchorToSourceNode[sufVarAnchor.index]
      if (!recordData) {
        console.warn(`异常: 数学运算块 没有指定参数 “数组”, 请检查图表连线！！！`)
      } else {
        // 获取参数依赖的变量
        const _var = this.getParameterDependentVariable(recordData)
        B = this.createSimpleProcessData('variable', _var)
      }
    } else {
      // 节点配置
      const _source = sufVarAnchor.data.value || '1'
      const userInput = this.generateCodeBlock(_source, DataType.Number)
      const { tempVarName, processData } = this.generateTempVar({ value: userInput })
      result.push(processData)
      B = this.createSimpleProcessData('variable', [tempVarName])
    }


    const mathProcessData = {
      id: this.generateUUID(),
      type: 'math_arithmetic_basic',
      value: {
        A,
        B,
        OP
      }
    }

    // 创建临时变量
    const {
      tempVarName,
      processData
    } = this.generateTempVar({ value: mathProcessData })

    // 存储“出参”的变量
    const varRecordKey = this.getVarRecordKey(returnAnchor.index)
    const varRecordVal = [tempVarName]
    this.setVar(method.nodeId, varRecordKey, varRecordVal) // 记录临时变量

    result.push(processData)

    this.result = result;
  }
}







