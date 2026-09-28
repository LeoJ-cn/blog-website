/**
 * 下次渲染结束执行
 */

import { SimpleProcessData } from '../../../types/process';
import { SideQuests_DTS, TranslateNodeParams_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'


export class TranslateNextTickService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const {
      method,
      cache
    } = query

    const statement = this.workFlow2ProcessData({
      methodWorkFlow: method.sideQuests?.[SideQuests_DTS.NEXT_TICK]?.[0] || [],
      cache
    });

    const nexttickProcessData = {
      id: this.generateUUID(),
      type: 'block_nexttick',
      value: {
        statement
      }
    }

    this.result = [nexttickProcessData];
  }
}



