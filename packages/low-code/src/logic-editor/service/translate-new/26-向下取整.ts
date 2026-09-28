
/**
 * 翻译： 26-向下取整
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
      type: "block_math_floor",
      value: {
        val: "this.createSimpleProcessData('variable', attrs.variable)",
      }
    }


    this.result = [currentSimpleProcessData];
  }
}

