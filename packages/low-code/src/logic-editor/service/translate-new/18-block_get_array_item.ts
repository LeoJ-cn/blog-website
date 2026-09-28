
/**
 * 翻译： 18. 获取数组第N项
 */

import { find } from 'lodash'
import { SimpleProcessData } from '../../../types/process';
import { AnchorTag_DTS, ConstOrVariable_DTS, TranslateNodeParams_DTS, DescInfo_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'
import { DataType } from '../../../types/schema';
export class TranslateAssignNodeService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    throw new Error('开发阶段！！！')

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId)


    const currentSimpleProcessData = {
      id: this.generateUUID(),
      type: 'getvalfromarr',
      value: {
        arr: 'this.createSimpleProcessData()',
        index: 'this.createSimpleProcessData()',
      },
    }


    this.result = [currentSimpleProcessData];
  }
}

