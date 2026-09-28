
/**
 * 翻译： 20.获取数组长度
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
      type: "block_array_length",
      value: {
        array: 'SimpleProcessData-Array'
      }
    }


    this.result = [currentSimpleProcessData];
  }
}

