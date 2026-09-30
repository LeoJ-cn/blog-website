/**
 * 翻译： 自定义方法块
 */

import { find, filter } from 'lodash'
import { FuncCallNode } from '../../runtime/FuncCallNode';
import { SimpleProcessData } from '../../../types/process';
import { IFuncNodeConfig, INodeConfig } from '../../interface/index';
import { TranslateNodeParams_DTS, AnchorTag_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'

export class TranslateFunctionNodeService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const result: SimpleProcessData[] = [];

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId) as INodeConfig<IFuncNodeConfig>
    const funcId = nodeInfo.data.funcId || ''
    const returnAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_OUTPUT,
      }
    )

    if (!funcId) {
      throw new Error(`异常：逻辑翻译错误，未匹配到 ${nodeInfo.type} ${nodeInfo.nodeId}  的自定义函数！！！`)
    }

    const params: Array<{ param: string; type: 'variable'; variable: string[] }> = [];
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
        const paramKeyLabel = nodeInfo.data.anchors[pa.index].data.label || '' // PS: 注意这里是中文！！！ 是中文！！！
        const recordData = method.map_FromAnchorToSourceNode[pa.index]
        if (!recordData) {
          const functionName = nodeInfo.data.funcLabel || method.nodeId
          console.warn(`异常: 函数（${functionName}）没有指定参数 ${paramKeyLabel} , 请检查图表连线！！！`)
          return
        }

        // 获取参数依赖的变量
        variable = this.getParameterDependentVariable(recordData)

        params.push({
          param: paramKeyLabel,
          type: "variable",
          variable
        })
      })
    }

    // 是否有返回值
    let attrs;
    if (returnAnchor) {
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
        funcname: funcId,
        leftVar: varRecordVal,
        funcReturn: {
          state: true,
          type: returnAnchor.data.type
        }
      }
    } else {
      attrs = {
        params,
        funcname: funcId
      }
    }

    const funcCallNode = new FuncCallNode({
      attrs
    });
    const processList = funcCallNode.generate()

    result.push(
      ...processList
    );

    this.result = result;
  }

}
