/**
 * 翻译： 消息提醒块
 */

import { find } from 'lodash'
import { ShowMessageNode } from '../../runtime/ShowMessageNode';
import { SimpleProcessData } from '../../../types/process';
import { IMessageNodeConfig, INodeConfig, MessageType } from '../../interface/index';
import { TranslateNodeParams_DTS, ConstOrVariable_DTS, AnchorTag_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'
import { DataType } from '../../../types/schema';

interface MessageParams {
  contentVar?: string[];
  messageType?: MessageType;
  duringVar?: string[];
}
export class TranslateMessageNodeService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const result: SimpleProcessData[] = []

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId) as INodeConfig<IMessageNodeConfig>

    // 提醒内容-锚点
    const paramNode = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_INPUT,
      }
    )

    if (!paramNode) {
      throw new Error('异常: 全局提醒块 没有 “提醒内容”的锚点，请检查！！！')
    }

    let _attrs: MessageParams = {}
    _attrs.messageType = nodeInfo.data.type || MessageType.SUCCESS; // 节点配置-提示类型

    // 常量还是变量
    const config_constOrVariable = paramNode.data.constOrVariable || ConstOrVariable_DTS.USE_VARIABLE

    // 使用变量（图标连线）
    if (config_constOrVariable === ConstOrVariable_DTS.USE_VARIABLE) {
      let contentVar;

      const recordData = method.map_FromAnchorToSourceNode[paramNode.index]
      if (!recordData) {
        console.warn(`异常: 全局提醒块 没有指定参数 “提醒内容”, 请检查图表连线！！！`)
      } else {
        // 获取参数依赖的变量
        contentVar = this.getParameterDependentVariable(recordData)
        _attrs.contentVar = contentVar

        // if (duringVar) {
        //   _attrs['duringVar'] = duringVar
        // }
      }

    } else {
      /**
       * 使用节点配置
       */

      const config_value = paramNode.data.value || '"Default Tip"'; // 节点配置-提示内容
      const userInput = this.generateCodeBlock(config_value, DataType.String)
      const { tempVarName, processData } = this.generateTempVar({ value: userInput })
      result.push(processData)

      // 使用常量
      _attrs.contentVar = [tempVarName]
    }



    const messageProcessData = new ShowMessageNode({
      attrs: _attrs
    }).generate()
    result.push(...messageProcessData)

    this.result = result;
  }
}



