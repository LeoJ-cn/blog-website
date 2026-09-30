/**
 * 翻译： 设置数组项块
 */

import { find } from 'lodash';
import { ForLoopNode } from '../../runtime/ForLoopNode';
import { SimpleProcessData } from '../../../types/process';
import {
  AnchorTag_DTS,
  TranslateNodeParams_DTS,
  SideQuests_DTS,
  DescInfo_DTS,
  ConstOrVariable_DTS,
} from '../interface';
import { TranslateBaseService } from './BaseService';
import { DataType } from '../../../types/schema';

export class TranslateSetArrayItemNodeService extends TranslateBaseService {
  result: SimpleProcessData[] = [];

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const { method, cache } = query;

    const nodeInfo = cache.getNode_FromCache(method.nodeId);

    // 数据源：数组
    const arrayAnchor = find(nodeInfo.data.anchors, {
      tag: AnchorTag_DTS.VAR_INPUT,
      data: {
        _desc: DescInfo_DTS.ARRAY_FOREACH_SOURCE,
      },
    });

    // 锚点：项
    const itemAnchor = find(nodeInfo.data.anchors, {
      tag: AnchorTag_DTS.VAR_INPUT,
      data: {
        _desc: DescInfo_DTS.ARRAY_FOREACH_ITEM,
      },
    });

    // 锚点：索引
    const indexAnchor = find(nodeInfo.data.anchors, {
      tag: AnchorTag_DTS.VAR_INPUT,
      data: {
        _desc: DescInfo_DTS.ARRAY_FOREACH_INDEX,
      },
    });

    if (!itemAnchor || !indexAnchor || !arrayAnchor) {
      throw new Error('异常: 设置数组项 没有配置 "数据源"  “索引” 或 “项”锚点的数据，请检查 _desc 的字段！！！');
    }

    let var_array: string[] = []; // 数组所属变量
    let var_item: string[] = []; // 数组项
    let var_index: string[] = []; // 索引index

    // 数据源
    const recordData = method.map_FromAnchorToSourceNode[arrayAnchor.index];
    if (!recordData) {
      console.warn(`异常: 设置数组项 没有指定参数 “数组”, 请检查图表连线！！！`);
    } else {
      // 获取参数依赖的变量
      var_array = this.getParameterDependentVariable(recordData);
    }

    const itemData = method.map_FromAnchorToSourceNode[itemAnchor.index];
    if (!itemData) {
      console.warn(`异常: 设置数组项 没有指定参数 “数组项”, 请检查图表连线！！！`);
    } else {
      // 获取参数依赖的变量
      var_item = this.getParameterDependentVariable(itemData);
    }

    const indexData = method.map_FromAnchorToSourceNode[indexAnchor.index];
    if (!indexData) {
      console.warn(`异常: 设置数组项 没有指定参数 索引, 请检查图表连线！！！`);
    } else {
      // 获取参数依赖的变量
      var_index = this.getParameterDependentVariable(indexData);
    }

    this.result = [
      {
        id: this.generateUUID(),
        type: 'assignblock',
        value: {
          leftVar: {
            id: this.generateUUID(),
            type: 'getvalfromarr',
            value: {
              arr: this.createSimpleProcessData('variable', var_array),
              index: this.createSimpleProcessData('variable', var_index),
            },
          },
          rightVar: this.createSimpleProcessData('variable', var_item),
        },
      },
    ];
  }
}
