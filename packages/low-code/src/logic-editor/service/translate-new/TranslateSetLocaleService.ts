/**
 * 设置多语言
 */

import { SimpleProcessData } from '../../../types/process';
import { TranslateNodeParams_DTS } from '../interface'
import { TranslateBaseService } from './BaseService'
import { ISetLocaleConfig, INodeConfig, LanguageMap } from '../../interface/index';


export class TranslateSetLocaleService extends TranslateBaseService {

  result: SimpleProcessData[] = []

  constructor(query: TranslateNodeParams_DTS) {
    super();


    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId) as INodeConfig<ISetLocaleConfig>

    const _lang = nodeInfo.data.language || LanguageMap.EN

    const setLanguageProcessData = {
      id: this.generateUUID(),
      type: 'block_multi_lang_set',
      value: {
        lang: _lang,
      }
    }

    this.result = [setLanguageProcessData];
  }
}




