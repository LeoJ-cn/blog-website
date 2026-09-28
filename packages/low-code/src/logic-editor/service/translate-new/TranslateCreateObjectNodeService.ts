/**
 * 翻译： 构建临时对象块
 */

import { find, filter } from 'lodash';
import { SimpleProcessData } from '../../../types/process';
import { AnchorTag_DTS, ConstOrVariable_DTS, TranslateNodeParams_DTS, DescInfo_DTS } from '../interface';
import { TranslateBaseService } from './BaseService';
import { DataType } from '../../../types/schema';

export class TranslateCreateObjectNodeService extends TranslateBaseService {
  result: SimpleProcessData[] = [];

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const result: SimpleProcessData[] = [];

    const geAssignBlockData = (leftVar: SimpleProcessData, rightVar: SimpleProcessData) => {
      return {
        id: this.generateUUID(),
        type: 'assignblock',
        value: {
          leftVar,
          rightVar,
        },
      };
    };

    const { method, cache } = query;

    const nodeInfo = cache.getNode_FromCache(method.nodeId);

    // 参数锚点
    const varAnchors = filter(nodeInfo.data.anchors, {
      tag: AnchorTag_DTS.VAR_INPUT,
    });

    // 右值锚点
    const returnAnchor = find(nodeInfo.data.anchors, {
      tag: AnchorTag_DTS.VAR_OUTPUT,
    });

    if (!returnAnchor) {
      throw new Error('异常: 构建临时对象块 没有配置“返回值” 锚点数据，请检查！！！');
    }

    // 创建临时变量
    const { tempVarName, processData } = this.generateTempVar({ value: this.generateCodeBlock('{}', DataType.Object) });

    // 存储“出参”的变量
    const returnRecordKey = this.getVarRecordKey(returnAnchor.index);
    const returnRecordVal = [tempVarName];
    this.setVar(method.nodeId, returnRecordKey, returnRecordVal); // 记录临时变量

    result.push(processData);

    varAnchors.forEach((varAnchor) => {
      // TODO: 获取参数的key name
      const currentKey = varAnchor.data.name;
      if (!currentKey) {
        throw new Error('异常: 构建临时对象块 没有配置属性的key数据，请检查！！！');
      }
      const leftVar = this.createSimpleProcessData('variable', [...returnRecordVal, currentKey]);

      /**
       *  参数
       */
      let rightVar;

      const recordData = method.map_FromAnchorToSourceNode[varAnchor.index];

      if (recordData) {
        rightVar = this.createSimpleProcessData('variable', this.getParameterDependentVariable(recordData));
      } else {
        // TODO: 节点配置(常量配置)
        const config_value = varAnchor.data.value || '""'; // 节点配置-提示内容
        // 直接写入代码
        rightVar = this.generateCodeBlock(config_value, DataType.Any);
      }

      const curProcessData = geAssignBlockData(leftVar, rightVar);
      result.push(curProcessData);
    });

    this.result = result;
  }
}

