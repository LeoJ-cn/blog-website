/**
 * 页面传值（路由信息）
 */

import { find } from 'lodash'
import { SimpleProcessData } from '../../../types/process';
import { AnchorTag_DTS, TranslateNodeParams_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'
import { IPagePassValue, INodeConfig, PagePassValueType } from '../../interface/index';

export class TranslatePagePassValueService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId) as INodeConfig<IPagePassValue>

    // 返回值
    const returnAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_OUTPUT
      }
    )

    if (!returnAnchor) {
      throw new Error('异常: 页面传值块 没有配置 “返回值”的锚点信息，请检查！！！')
    }

    const _routecontent = nodeInfo.data.page_pass_value_type || PagePassValueType.NAME

    // 获取路由信息
    const getRouteInfoProcessData = {
      id: this.generateUUID(),
      type: 'route',
      value: {
        routecontent: _routecontent,
      }
    }

    // 创建临时变量
    const {
      tempVarName,
      processData
    } = this.generateTempVar({ value: getRouteInfoProcessData })

    // 存储“出参”的变量
    const varRecordKey = this.getVarRecordKey(returnAnchor.index)
    const varRecordVal = [tempVarName]
    this.setVar(method.nodeId, varRecordKey, varRecordVal) // 记录临时变量

    this.result = [processData];
  }
}





