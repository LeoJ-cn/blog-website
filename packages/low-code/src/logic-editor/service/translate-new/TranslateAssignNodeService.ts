
/**
 * 翻译： 赋值块
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

    let leftvarVariable: string[] = [];  // 变量
    let rightvalVariable: string[] = []; // 值

    const {
      method,
      cache
    } = query

    const nodeInfo = cache.getNode_FromCache(method.nodeId)

    // 变量锚点
    const varAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_INPUT,
        data: {
          _desc: DescInfo_DTS.VARIABLE
        }
      }
    )

    // 右值锚点
    const rightValueAnchor = find(
      nodeInfo.data.anchors,
      {
        tag: AnchorTag_DTS.VAR_INPUT,
        data: {
          _desc: DescInfo_DTS.VALUE
        }
      }
    )

    if (!varAnchor || !rightValueAnchor) {
      throw new Error('异常: 赋值块 没有配置“前/后 值”锚点数据，请检查！！！')
    }

    // 获取变量
    const recordData = method.map_FromAnchorToSourceNode[varAnchor.index]
    if (recordData) {
      // 获取参数依赖的变量
      leftvarVariable = this.getParameterDependentVariable(recordData)
    } else {
      console.warn('异常: 赋值块 没有指定“变量”的锚点，请检查！！！')
    }

    /**
     * 左侧变量
     */
    const leftVar = this.createSimpleProcessData('variable', leftvarVariable)

    /**
     *  右侧（更新的值）
     */
    let rightVar;

    // 常量还是变量
    const config_constOrVariable = rightValueAnchor.data.constOrVariable || ConstOrVariable_DTS.USE_VARIABLE

    // 变量连线
    if (config_constOrVariable === ConstOrVariable_DTS.USE_VARIABLE) {
      const recordData = method.map_FromAnchorToSourceNode[rightValueAnchor.index]
      if (!recordData) {
        console.warn(`异常: 赋值块 没有指定参数 “值”的锚点, 请检查图表连线！！！`)
      } else {
        // 获取参数依赖的变量
        rightvalVariable = this.getParameterDependentVariable(recordData)
        rightVar = this.createSimpleProcessData('variable', rightvalVariable)
      }
    } else {
      // 节点配置
      const config_value = rightValueAnchor.data.value || '"Default Value"'; // 节点配置-提示内容
      // 直接写入代码
      rightVar = this.generateCodeBlock(config_value, DataType.Any)
    }

    const assign_SimpleProcessData = {
      id: this.generateUUID(),
      type: "assignblock",
      value: {
        leftVar,
        rightVar,
      }
    }


    this.result = [assign_SimpleProcessData];
  }
}

