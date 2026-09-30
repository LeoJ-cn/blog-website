/**
 * 翻译： 开始块
 */

import { filter } from 'lodash'
import { TranslateBaseService } from './BaseService'
import { SimpleProcessData } from '../../../types/process';
import { TranslateNodeParams_DTS, AnchorTag_DTS } from '../interface'

export class TranslateStartNodeService extends TranslateBaseService {
  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId)
    const varoutputList = filter(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_OUTPUT,
      }
    )

    // 记录出参变量
    if (varoutputList && varoutputList.length) {
      varoutputList.forEach(varoutput => {
        // 存储“出参”的变量
        const varRecordKey = this.getVarRecordKey(varoutput.index)
        const _var = varoutput.data.name
        if (!_var) {
          console.error(`异常: 开始块的第 ${varoutput.index} 个锚点配置有问题， 没有配置 出参 的name，请检查！！！`)
          return;
        }
        const varRecordVal = [_var]
        this.setVar(method.nodeId, varRecordKey, varRecordVal) // 记录临时变量
      })
    }

    this.result = []
  }

}
