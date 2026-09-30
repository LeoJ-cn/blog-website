/**
 * 路由跳转
 */

import { find } from 'lodash'
import { SimpleProcessData } from '../../../types/process';
import { IRouteNodeConfig, INodeConfig } from '../../interface/index';
import { TranslateNodeParams_DTS, AnchorTag_DTS, DescInfo_DTS, ConstOrVariable_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'
import { DataType } from '../../../types/schema';


export class TranslateRouterLinkNodeService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const result: SimpleProcessData[] = [];

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId) as INodeConfig<IRouteNodeConfig>

    // params参数
    const paramsAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_INPUT,
        data: {
          _desc: DescInfo_DTS.ROUTER_PARAMS
        }
      }
    )

    // query参数
    const queryAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_INPUT,
        data: {
          _desc: DescInfo_DTS.ROUTER_QUERY
        }
      }
    )

    if (!paramsAnchor || !queryAnchor) {
      throw new Error('异常: 路由跳转块 没有配置 param参数/query参数 的锚点，请检查锚点配置！！！')
    }

    let _route = nodeInfo.data.target_page || '';
    let _param: string[]; // param变量
    let _query: string[]; // query变量

    // 更新：params变量
    const param_config_constOrVariable = paramsAnchor.data.constOrVariable || ConstOrVariable_DTS.USE_VARIABLE
    if (param_config_constOrVariable === ConstOrVariable_DTS.USE_VARIABLE) {
      const recordData = method.map_FromAnchorToSourceNode[paramsAnchor.index]
      if (!recordData) {
        throw new Error('异常: 路由跳转块没有连接“param变量”，请检查图表连线！！！')
      } else {
        // 获取参数依赖的变量
        _param = this.getParameterDependentVariable(recordData)
      }
    } else {
      // 节点配置
      const _source = paramsAnchor.data.value || '{}'
      const userInput = this.generateCodeBlock(_source, DataType.Object)
      const { tempVarName, processData } = this.generateTempVar({ value: userInput })
      result.push(processData)
      _param = [tempVarName]
    }

    // 更新：query变量
    const query_config_constOrVariable = queryAnchor.data.constOrVariable || ConstOrVariable_DTS.USE_VARIABLE
    if (query_config_constOrVariable === ConstOrVariable_DTS.USE_VARIABLE) {
      const recordData = method.map_FromAnchorToSourceNode[queryAnchor.index]
      if (!recordData) {
        throw new Error('异常: 路由跳转块没有连接“query变量”，请检查图表连线！！！')
      } else {
        // 获取参数依赖的变量
        _query = this.getParameterDependentVariable(recordData)
      }
    } else {
      // 节点配置
      const _source = queryAnchor.data.value || '{}'
      const userInput = this.generateCodeBlock(_source, DataType.Object)
      const { tempVarName, processData } = this.generateTempVar({ value: userInput })
      result.push(processData)
      _query = [tempVarName]
    }


    const routerLinkProcessData = {
      id: this.generateUUID(),
      type: 'router_link_dynamic',
      mutation: {
        arguments: 'param,query', // 是否放开配置
        isTextInput: 'false',
        textType: 'path',
      },
      value: {
        route: _route,
        param: this.createSimpleProcessData('variable', _param),
        query: this.createSimpleProcessData('variable', _query),
      },
    }

    result.push(routerLinkProcessData)

    this.result = result;
  }
}



