/**
 * 翻译： 循环块
 */


import { find } from 'lodash'
import { ForLoopNode } from '../../runtime/ForLoopNode';
import { SimpleProcessData } from '../../../types/process';
import { AnchorTag_DTS, TranslateNodeParams_DTS, SideQuests_DTS, DescInfo_DTS, ConstOrVariable_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'
import { DataType } from '../../../types/schema';

export class TranslateArrayForeachNodeService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const result: SimpleProcessData[] = []

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId)

    // 数据源：数组
    const arrayAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_INPUT,
        data: {
          _desc: DescInfo_DTS.ARRAY_FOREACH_SOURCE
        }
      }
    )

    // 锚点：项
    const itemAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        data: {
          _desc: DescInfo_DTS.ARRAY_FOREACH_ITEM
        }
      }
    )

    // 锚点：索引
    const indexAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        data: {
          _desc: DescInfo_DTS.ARRAY_FOREACH_INDEX
        }
      }
    )

    if (!itemAnchor || !indexAnchor || !arrayAnchor) {
      throw new Error('异常: 数组循环块 没有配置 "数据源"  “索引” 或 “项”锚点的数据，请检查 _desc 的字段！！！')
    }


    let var_array: string[] = []; // 数组所属变量
    let var_item = ''; // 项 的变量名
    let var_index = ''; // 索引index : `${var_item}count`


    /**
     * 数据源：连线变量 或者  节点配置
     */
    const config_constOrVariable = arrayAnchor.data.constOrVariable || ConstOrVariable_DTS.USE_VARIABLE

    // 变量
    if (config_constOrVariable === ConstOrVariable_DTS.USE_VARIABLE) {
      const recordData = method.map_FromAnchorToSourceNode[arrayAnchor.index]
      if (!recordData) {
        console.warn(`异常: 循环块 没有指定参数 “数组”, 请检查图表连线！！！`)
      } else {
        // 获取参数依赖的变量
        var_array = this.getParameterDependentVariable(recordData)
      }
    } else {
      // 节点配置
      const _source = arrayAnchor.data.value || '[]'
      const userInput = this.generateCodeBlock(_source, DataType.Array)
      const { tempVarName, processData } = this.generateTempVar({ value: userInput })
      result.push(processData)
      var_array = [tempVarName]
    }

    // 项
    var_item = `item${this.getForEachItemCount()}`
    // 索引
    var_index = `${var_item}count`



    // 存储“出参”的变量： 索引
    const indexVarRecordKey = this.getVarRecordKey(indexAnchor.index)
    const indexVarRecordVal = [var_index]
    this.setVar(method.nodeId, indexVarRecordKey, indexVarRecordVal)

    // 存储“出参”的变量： 项
    const itemVarRecordKey = this.getVarRecordKey(itemAnchor.index)
    const itemVarRecordVal = [var_item]
    this.setVar(method.nodeId, itemVarRecordKey, itemVarRecordVal)


    // 循环体
    const statement = this.workFlow2ProcessData({
      methodWorkFlow: method.sideQuests?.[SideQuests_DTS.FOREACH_BODY_SYNTAX]?.[0] || [],
      cache
    });

    const forLoopNode = new ForLoopNode({
      attrs: {
        array: var_array,
        item: var_item
      }
    });
    const processList = forLoopNode.generate()

    // 手动更新“数组的循环体”SimpleProcessData
    if (processList && processList.length) {
      processList[0].value.statement = statement
    }

    result.push(
      ...processList
    );



    this.result = result;
  }
}



