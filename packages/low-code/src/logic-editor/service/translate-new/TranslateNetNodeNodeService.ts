/**
 * 网络请求（参考 平台-开发空间， 网络请求）logic-net-node
 */

import { find } from 'lodash'
import { SimpleProcessData } from '../../../types/process';
import { INetNodeConfig, INodeConfig, RequestType } from '../../interface/index';
import { TranslateNodeParams_DTS, AnchorTag_DTS, DescInfo_DTS, ConstOrVariable_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'
import { DataType } from '../../../types/schema';

/**
 * 请求发起方
 */
enum AjaxFrom_DTS {
  IDG = 'idg',
  APP = 'post',
  ROOT = 'delete',
}

export class TranslateNetNodeNodeService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const result: SimpleProcessData[] = []

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId) as INodeConfig<INetNodeConfig>

    // 返回值
    const returnAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_OUTPUT
      }
    )

    // 请求地址
    const urlAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_INPUT,
        data: {
          _desc: DescInfo_DTS.NETWORK_REQUEST_URL
        }
      }
    )

    // 请求参数
    const paramsAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_INPUT,
        data: {
          _desc: DescInfo_DTS.NETWORK_REQUEST_PARAMS
        }
      }
    )

    // 请求头
    const headerAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_INPUT,
        data: {
          _desc: DescInfo_DTS.NETWORK_REQUEST_HEADER
        }
      }
    )

    // 请求栈
    const stackAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_INPUT,
        data: {
          _desc: DescInfo_DTS.NETWORK_REQUEST_STACK
        }
      }
    )


    if (!returnAnchor || !urlAnchor || !paramsAnchor || !headerAnchor || !stackAnchor) {
      throw new Error('异常: 网络请求块 没有配置 “返回值”/“请求地址”/“请求头”/“请求参数”/“请求栈”的锚点配置，请检查！！！')
    }


    let _method: RequestType; // 请求方式
    let _urlVar: string[]; // 地址变量
    let _params: string[]; // 参数-变量
    let _headers: string[]; // 请求头-变量
    let _stack: string[]; // 请求栈-变量

    _method = nodeInfo.data.requestType || RequestType.GET; // 节点配置-请求方式

    // 更新：请求地址
    const url_config_constOrVariable = urlAnchor.data.constOrVariable || ConstOrVariable_DTS.USE_VARIABLE
    if (url_config_constOrVariable === ConstOrVariable_DTS.USE_VARIABLE) {
      const recordData = method.map_FromAnchorToSourceNode[urlAnchor.index]
      if (!recordData) {
        console.warn(`异常: 网络请求块 没有指定参数 “地址”, 请检查图表连线！！！`)
      } else {
        // 获取参数依赖的变量
        _urlVar = this.getParameterDependentVariable(recordData)
      }
    } else {
      // 节点配置
      const _source = urlAnchor.data.value || '"Default Url"'
      const userInput = this.generateCodeBlock(_source, DataType.String)
      const { tempVarName, processData } = this.generateTempVar({ value: userInput })
      result.push(processData)
      _urlVar = [tempVarName]
    }


    // 更新：请求参数
    const params_config_constOrVariable = paramsAnchor.data.constOrVariable || ConstOrVariable_DTS.USE_VARIABLE
    if (params_config_constOrVariable === ConstOrVariable_DTS.USE_VARIABLE) {
      const recordData = method.map_FromAnchorToSourceNode[paramsAnchor.index]
      if (!recordData) {
        console.warn(`异常: 网络请求块 没有指定参数 “请求参数”, 请检查图表连线！！！`)
      } else {
        // 获取参数依赖的变量
        _params = this.getParameterDependentVariable(recordData)
      }
    } else {
      // 节点配置
      const _source = paramsAnchor.data.value || '{}'
      const userInput = this.generateCodeBlock(_source, DataType.Object)
      const { tempVarName, processData } = this.generateTempVar({ value: userInput })
      result.push(processData)
      _params = [tempVarName]
    }


    // 更新：请求头
    const header_config_constOrVariable = headerAnchor.data.constOrVariable || ConstOrVariable_DTS.USE_VARIABLE
    if (header_config_constOrVariable === ConstOrVariable_DTS.USE_VARIABLE) {
      const recordData = method.map_FromAnchorToSourceNode[headerAnchor.index]
      if (!recordData) {
        console.warn(`异常: 网络请求块 没有指定参数 “请求头”, 请检查图表连线！！！`)
      } else {
        // 获取参数依赖的变量
        _headers = this.getParameterDependentVariable(recordData)
      }
    } else {
      // 节点配置
      const _source = headerAnchor.data.value || '{}'
      const userInput = this.generateCodeBlock(_source, DataType.Object)
      const { tempVarName, processData } = this.generateTempVar({ value: userInput })
      result.push(processData)
      _headers = [tempVarName]
    }


    // 更新：请求栈
    const stack_config_constOrVariable = stackAnchor.data.constOrVariable || ConstOrVariable_DTS.USE_VARIABLE
    if (stack_config_constOrVariable === ConstOrVariable_DTS.USE_VARIABLE) {
      const recordData = method.map_FromAnchorToSourceNode[stackAnchor.index]
      if (!recordData) {
        console.warn(`异常: 网络请求块 没有指定参数 “请求栈”, 请检查图表连线！！！`)
      } else {
        // 获取参数依赖的变量
        _stack = this.getParameterDependentVariable(recordData)
      }
    } else {
      // 节点配置
      const _source = stackAnchor.data.value || '[]'
      const userInput = this.generateCodeBlock(_source, DataType.Array)
      const { tempVarName, processData } = this.generateTempVar({ value: userInput })
      result.push(processData)
      _stack = [tempVarName]
    }


    const networkProcessData = {
      id: this.generateUUID(),
      type: 'network_callapi_request',
      mutation: {
        arguments: 'request_header,request_stack',
      },
      value: {
        requestStart: AjaxFrom_DTS.IDG, // 'idg' || 'app' || 'root'
        method: _method, // 'get'|| 'post' || 'delete' || 'put' || 'patch'
        url: this.createSimpleProcessData('variable', _urlVar), // 地址-变量
        params: this.createSimpleProcessData('variable', _params), // 请求参数-变量
        request_header: this.createSimpleProcessData('variable', _headers), // 请求头-变量
        request_stack: this.createSimpleProcessData('variable', _stack), // 请求堆-变量
      },
    }

    // 创建临时变量
    const {
      tempVarName,
      processData
    } = this.generateTempVar({ value: networkProcessData })

    // 存储“出参”的变量
    const varRecordKey = this.getVarRecordKey(returnAnchor.index)
    const varRecordVal = [tempVarName]
    this.setVar(method.nodeId, varRecordKey, varRecordVal) // 记录临时变量

    result.push(processData)

    this.result = result;
  }
}


