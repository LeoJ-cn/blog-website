/**
 * 获取多语言
 * 1. 当前语言环境
 * 2. 选择的字段的翻译
 */

import { find } from 'lodash';
import { SimpleProcessData } from '../../../types/process';
import { TranslateNodeParams_DTS, AnchorTag_DTS, DescInfo_DTS } from '../interface';
import { TranslateBaseService } from './BaseService';
import { IGetLocalLan, INodeConfig } from '../../interface/index';

export class TranslateGetLocaleService extends TranslateBaseService {
  result: SimpleProcessData[] = [];

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const { method, cache } = query;

    const nodeInfo = cache.getNode_FromCache(method.nodeId) as INodeConfig<IGetLocalLan>;

    // 获取当前语言锚点
    const currentLanguageAnchor = find(nodeInfo.data.anchors, {
      tag: AnchorTag_DTS.VAR_OUTPUT,
      data: {
        _desc: DescInfo_DTS.CURRENT_LANGUAGE,
      },
    });

    // 返回值锚点
    const returnAnchor = find(nodeInfo.data.anchors, {
      tag: AnchorTag_DTS.VAR_OUTPUT,
      data: {
        _desc: DescInfo_DTS.RETURN_VALUE,
      },
    });

    if (!currentLanguageAnchor || !returnAnchor) {
      throw new Error('异常: 获取多语言块 没有配置“多语言类型”或“返回值”的锚点数据, 请检查！！！');
    }

    // 获取当前语言类型
    const currentLanguageProcessData = {
      id: this.generateUUID(),
      type: 'block_multi_lang_get',
    };
    // 创建临时变量：当前语言类型
    const { tempVarName, processData: languageProcess } = this.generateTempVar({ value: currentLanguageProcessData });
    // 存储“出参”的变量：当前语言类型
    const varRecordKey = this.getVarRecordKey(currentLanguageAnchor.index);
    const varRecordVal = [tempVarName];
    this.setVar(method.nodeId, varRecordKey, varRecordVal); // 记录临时变量

    // 获取翻译
    const i18nKey = nodeInfo.data.i18nKey || '';
    const getRouteInfoProcessData = {
      id: this.generateUUID(),
      type: 'block_multilingual_choose',
      value: {
        pageLocaleValue: i18nKey,
      },
    };
    // 创建临时变量：当前语言类型
    const { tempVarName: tempVarName2, processData: routeInfoProcess } = this.generateTempVar({
      value: getRouteInfoProcessData,
    });
    // 存储“出参”的变量：当前语言类型
    const varRecordKey2 = this.getVarRecordKey(returnAnchor.index);
    const varRecordVal2 = [tempVarName2];
    this.setVar(method.nodeId, varRecordKey2, varRecordVal2); // 记录临时变量

    this.result = [languageProcess, routeInfoProcess];
  }
}

