
/**
 * 翻译： 结束块
 */


import { find } from 'lodash'
import { TranslateBaseService } from './BaseService'
import { SimpleProcessData } from '../../../types/process';
import { AnchorTag_DTS, TranslateNodeParams_DTS } from '../interface'

export class TranslateEndNodeService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const result: SimpleProcessData[] = [];

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId)

    const returnAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_INPUT,
      }
    )

    if (returnAnchor) {
      const recordData = method.map_FromAnchorToSourceNode[returnAnchor.index]
      if (!recordData) {
        console.warn('当前方法已声明返回值，但结束节点尚未连接返回数据；保存结果将不包含 funcreturn。')
      } else {
        // 获取参数依赖的变量
        const return_variable = this.getParameterDependentVariable(recordData)
        const returnVal = this.createSimpleProcessData('variable', return_variable)

        const endProcess = {
          id: this.generateUUID(),
          type: 'funcreturn',
          value: {
            returnVal
          }
        }

        result.push(endProcess)
      }
    }

    this.result = result;
  }

}
