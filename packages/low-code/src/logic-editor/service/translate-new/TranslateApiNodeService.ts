/**
 * 翻译： api列表调用
 */

import { find, filter } from 'lodash'
import { CallApiNode } from '../../runtime/CallApiNode';
import { SimpleProcessData } from '../../../types/process';
import { IApiConfig, INodeConfig } from '../../interface/index';
import { TranslateNodeParams_DTS, AnchorTag_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'

export class TranslateApiNodeService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const result: SimpleProcessData[] = [];

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId) as INodeConfig<IApiConfig>
    const apiInfo = nodeInfo.data.api

    if (!apiInfo) {
      throw new Error(`异常: 该api ${method.nodeId} 没有api配置，请检查锚点的 api 字段！！！`)
    }

    const realizationInfo = JSON.parse(apiInfo.realization || "{}")
    const returnAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_OUTPUT,
      }
    )

    const params: Array<{ param: string; type: 'variable'; value: string[] }> = [];
    const paramNodes = filter(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_INPUT,
      }
    )

    // 入参配置
    if (paramNodes && paramNodes.length) {
      paramNodes.forEach(pa => {
        let variable: string[] = [] // 临时变量或者其他变量
        const paramKey = nodeInfo.data.anchors[pa.index].data.name || ''
        const recordData = method.map_FromAnchorToSourceNode[pa.index]
        if (!recordData) {
          const functionName = `${apiInfo.library_label}_${apiInfo.category_label}`
          console.warn(`异常: api列表（${functionName}）没有指定参数 ${paramKey} , 请检查图表连线！！！`)
          return
        }

        // 获取参数依赖的变量
        variable = this.getParameterDependentVariable(recordData)

        params.push({
          param: paramKey,
          type: "variable",
          value: variable
        })
      })
    }

    // 是否有返回值
    let attrs;
    if (returnAnchor && realizationInfo.isReturn) {
      const {
        tempVarName,
        processData
      } = this.generateTempVar()

      // 存储“出参”的变量
      const varRecordKey = this.getVarRecordKey(returnAnchor.index)
      const varRecordVal = [tempVarName]
      this.setVar(method.nodeId, varRecordKey, varRecordVal) // 记录临时变量
      result.push(processData)

      attrs = {
        params,
        api: apiInfo,
        leftVar: varRecordVal
      }
    } else {
      attrs = {
        params,
        api: apiInfo
      }
    }

    const apiCallNode = new CallApiNode({
      attrs
    });
    const processList = apiCallNode.generate()

    result.push(
      ...processList
    );

    this.result = result;
  }

}
