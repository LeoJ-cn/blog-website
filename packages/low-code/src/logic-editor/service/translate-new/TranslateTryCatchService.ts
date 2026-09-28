/**
 * 翻译： try-catch 块
 */

import { TranslateBaseService } from './BaseService'
import { SimpleProcessData } from '../../../types/process';
import { TranslateNodeParams_DTS, SideQuests_DTS } from '../interface'

export class TranslateTryCatchService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();

    const {
      method,
      cache
    } = query

    const try_statement = this.workFlow2ProcessData({
      methodWorkFlow: method.sideQuests?.[SideQuests_DTS.TRY_SYNTAX]?.[0] || [],
      cache
    });
    const catch_statement = this.workFlow2ProcessData({
      methodWorkFlow: method.sideQuests?.[SideQuests_DTS.CATCH_SYNTAX]?.[0] || [],
      cache
    });
    const try_catch_SimpleProcessData = {
      id: this.generateUUID(),
      type: "try_catch",
      value: {
        try_statement,
        catch_statement,
      }
    }

    this.result = [try_catch_SimpleProcessData];
  }

}

