/**
 * 获取方法引用
 */

import { find } from 'lodash'
import { SimpleProcessData } from '../../../types/process';
import { TranslateNodeParams_DTS, AnchorTag_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'
import { IMethodRef, INodeConfig } from '../../interface/index';


export class TranslateMethodRefService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId) as INodeConfig<IMethodRef>

    // 返回值锚点
    const returnAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_OUTPUT,
      }
    )

    if (!returnAnchor) {
      throw new Error('异常: 获取方法引用块 没有配置 “返回值”的锚点，请检查 ！！！')
    }

    const _method = nodeInfo.data.methodId
    if (!_method) {
      throw new Error('获取方法引用节点未选择目标方法')
    }

    const methodRefProcessData = {
      id: this.generateUUID(),
      type: 'block_method_ref',
      value: {
        method: _method,
      },
    }

    // 创建临时变量
    const {
      tempVarName,
      processData
    } = this.generateTempVar({ value: methodRefProcessData })

    // 存储“出参”的变量
    const varRecordKey = this.getVarRecordKey(returnAnchor.index)
    const varRecordVal = [tempVarName]
    this.setVar(method.nodeId, varRecordKey, varRecordVal) // 记录临时变量

    this.result = [processData];
  }
}

