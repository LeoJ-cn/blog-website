import { FuncCallNode } from '../../runtime/FuncCallNode';
import ProcessPageModel from '../../runtime/ProcessPageModel'
import { ROOTCOMPONENT } from '../../compat/component';
import { SimpleProcessData } from '../../../types/process';
import { DataType } from '../../../types/schema';

import { EdgeError_DTS, TranslateError_DTS, GenerateTempParams_DTS, ConnectedNodeInfo_DTS, AllVarOutputMap_DTS, BlockNames_DTS, InitTranslateQuery_DTS, TranslateNodeParams_DTS } from '../interface'
import { get } from 'lodash'
import { CacheService } from '../cache-service';
import { SCOPE_HUB_NODE } from '../const'

class MixFactory extends ProcessPageModel {
  public getCurrentDataList(): [] {
    return []
  }
  // public getDataList() {
  //   const dataList = blockMixin.getDataOptions(blockMixin.dataManage.all());
  //   return dataList;
  // }
}


export class TranslateBaseService {
  constructor() { }

  /**
   * 翻译前初始化
   */
  public init(utils = {}, cache = new CacheService({})) {
    TranslateBaseService.translateErrorList = []
    TranslateBaseService.allVarOutputMap = {}
    TranslateBaseService.forEachItemCount = 0
    TranslateBaseService.temVarCount = 0
    TranslateBaseService.utils = utils;
    TranslateBaseService.cache = cache
  }

  /**
   * 非法的信息
   */
  static translateErrorList: TranslateError_DTS[] = []

  /** 最近一次翻译生成的旧运行时流程；与 `blockly` 使用同一输入图。 */
  public processData: SimpleProcessData[] = []

  /**
   * 变量存储 (实例共享)
   */
  static allVarOutputMap: AllVarOutputMap_DTS = {}

  /**
   * 循环计数
   */
  static forEachItemCount = 0;

  /**
   * 临时变量计数
   */
  static temVarCount = 0;

  /**
   * 块翻译方法
   * TODO: 动态加载
   */
  static utils: Partial<Record<BlockNames_DTS, new (query: TranslateNodeParams_DTS) => { result: SimpleProcessData[] }>> = {}

  /**
   * 缓存服务
   */
  static cache: CacheService

  /**
   * 变量类型的锚点（不会被分析进入主流程的节点）
   */
  static varBlockList = [
    BlockNames_DTS.LOGIC_VARIABLE_DETIAL_NODE, // 变量详情
    BlockNames_DTS.LOGIC_STRING_NODE, // 变量（字符串）
    BlockNames_DTS.LOGIC_BOOLEAN_NODE, // 变量（布尔值）
    BlockNames_DTS.LOGIC_NUMBER_NODE, // 变量（数字）
    BlockNames_DTS.LOGIC_ARRAY_NODE, // 变量（数组）
    BlockNames_DTS.LOGIC_OBJECT_NODE, // 变量（对象）
  ]

  public getForEachItemCount() {
    return TranslateBaseService.forEachItemCount++
  }

  /**
   * 获取记录锚点存储变量的key
   */
  public getVarRecordKey(anchorIndex: number | string): string {
    return `anchor_${anchorIndex}`;
  }

  /**
   * 设置变量
   */
  public setVar(nodeId: string, anchor_index: string, _var: string[]) {
    if (!TranslateBaseService.allVarOutputMap[nodeId]) {
      TranslateBaseService.allVarOutputMap[nodeId] = {}
    }
    TranslateBaseService.allVarOutputMap[nodeId][anchor_index] = _var
  }

  /**
   * 获取变量
   */
  public getVar(nodeId: string, anchor_index: string): string[] | undefined {
    return TranslateBaseService.allVarOutputMap[nodeId]?.[anchor_index]
  }


  /**
   * 生成临时变量
   * TODO: 变量名优化，添加业务说明
   */
  public generateTempVar(generateTempParams?: GenerateTempParams_DTS) {
    const {
      value
    } = generateTempParams || {}

    const createNode = new FuncCallNode({});
    const tempVarName = `_tt_temp_var_${TranslateBaseService.temVarCount++}`
    const processData = createNode.createSimpleProcessData('set_tempvar', {
      name: tempVarName,
      value: value || createNode.createSimpleProcessData('null'),
    }) as SimpleProcessData
    return {
      tempVarName,
      processData
    }
  }

  /**
   * 随机ID...
   */
  public generateUUID() {
    return new FuncCallNode({}).generateId()
  }

  /**
   * 用户输入内容生成“伪代码”块(可理解为：不翻译直接注入的代码字符串)
   */
  public generateCodeBlock(codeString: string, type: DataType): SimpleProcessData {
    let tempVar: string = String(codeString);

    switch (type) {
      case DataType.String:
        const _str = tempVar.trim();
        const hasMarks = /^['].*?[']$/.test(_str) || /^["].*?["]$/.test(_str)
        if (!hasMarks) {
          // 防止用户输入异常数据：前面单引号，后面双引号，导致异常的字符串代码
          tempVar = '`' + tempVar + '`';
        }
        break;
      case DataType.Number:
        tempVar = `${Number(tempVar)}`
        break;
      case DataType.Object:
      case DataType.Array:
      case DataType.Boolean:
      case DataType.Any:
      default:
        break;
    }

    return {
      id: this.generateUUID(),
      type: "funcgettempvar",
      value: {
        tempVar
      }
    }
  }

  /**
   * 生成变量块
   */
  public createSimpleProcessData(type: string, value?: any): SimpleProcessData {
    const processData = new FuncCallNode({}).createSimpleProcessData(type, value)
    if (!processData) throw new Error(`异常: 无法创建 ${type} 过程数据！！！`)
    return processData
  }

  /**
   * 依赖变量解析
   * 1. 参数依赖是个 “变量块”
   * 2. 参数依赖是 ”非变量块“
  */
  public getParameterDependentVariable(recordData: ConnectedNodeInfo_DTS): string[] {

    const {
      edge,
      targetNode,
      sourceNode,
      connnectedAnchorIndex
    } = recordData

    let variable: string[] = []

    if (TranslateBaseService.varBlockList.includes(sourceNode.type as BlockNames_DTS)) {
      const connectedAnchor = sourceNode.data.anchors[Number(connnectedAnchorIndex)]
      if (!connectedAnchor) {
        throw new Error(`异常: 变量块 ${sourceNode.id} 缺少第 ${connnectedAnchorIndex} 个锚点！！！`)
      }
      const connectedAnchorInfo = connectedAnchor.data
      const varBaseInfo = connectedAnchorInfo._route_path || ''
      if (!varBaseInfo) {
        console.error(`异常: “变量块  ${sourceNode.type} ${sourceNode.id}”没有配置第 ${connnectedAnchorIndex} 个锚点的_route_path，请检查！！！`)
      } else {
        /**
         * -内部变量 || 相对全局变量
         * -内部变量第一个变量名 替换成 _tt_temp_var 存储的变量名
         */
        const originNodeId = connectedAnchorInfo._origin_node_id || ''
        const originAnchorIndex = connectedAnchorInfo._origin_anchor_index || 0
        if (!originNodeId) {
          // 相对全局变量
          variable = varBaseInfo.split('.')
        } else {
          // 内部临时变量
          const varRecordKey = this.getVarRecordKey(originAnchorIndex)
          const originVar = this.getVar(originNodeId, varRecordKey)
          const tpl = varBaseInfo.split('.') // 举例：'{固定字段}.key1.key2.key3...'
          variable = [...(originVar || []), ...tpl.slice(1)]
        }
      }

    } else {
      const varRecordKey = this.getVarRecordKey(connnectedAnchorIndex)
      const recordedVariable = this.getVar(sourceNode.id, varRecordKey)
      if (!recordedVariable) {
        throw new Error(`异常: 当前 ${sourceNode.type} ${sourceNode.id} 块，第 ${connnectedAnchorIndex} 个锚点没有记录使用变量，请检查！！！`)
      }
      variable = recordedVariable
    }

    const isChild = this.isChildOf(recordData)
    if (!isChild) {
      TranslateBaseService.translateErrorList.push({
        edge: edge.id ?? '',
        errorType: EdgeError_DTS.SCOPE,
        variable
      })
    }

    return variable
  }

  /**
   * 作用域校验(一个块的返回值的作用域，只可能是一种情况，要么就是所有子节点可以访问，要么就是只有函数题内部才能访问)
   * 1. 变量节点（找到生成变量节点的根节点，然后判断作用域）
   * 2. 非变量节点 （直接判断节点间的关系）
   * 3. 判断标准：
   *      3.1  所有子节点可访问
   *      3.2  只有函数体内部的节点才可以访问(forEach等产生内部变量的块)
   */
  private isChildOf(recordData: ConnectedNodeInfo_DTS): boolean {

    let isChild = false

    const cache = TranslateBaseService.cache;
    const {
      targetNode,
      sourceNode,
      connnectedAnchorIndex
    } = recordData

    const isDependentNodeVar = TranslateBaseService.varBlockList.includes(sourceNode.type as BlockNames_DTS)


    const sonNodeId = targetNode.id;
    let parentNodeId: string;

    // 依赖数据来自变量节点
    if (isDependentNodeVar) {
      const connectedAnchor = sourceNode.data.anchors[Number(connnectedAnchorIndex)]
      if (!connectedAnchor) {
        throw new Error(`异常: 变量块 ${sourceNode.id} 缺少第 ${connnectedAnchorIndex} 个锚点！！！`)
      }
      parentNodeId = connectedAnchor.data._origin_node_id || BlockNames_DTS.LOGIC_START_NODE
    } else {
      parentNodeId = sourceNode.id || BlockNames_DTS.LOGIC_START_NODE
    }

    /**
      *  1. 所有子节点可访问
      *  2. 只有函数体内部的节点才可以访问(forEach等产生内部变量的块)
     */
    const parentNode = cache.getNode_FromCache(parentNodeId)
    switch (parentNode.type) {
      case BlockNames_DTS.LOGIC_ARRAY_FOREACH_NODE:
        const hubNodeList = cache.getScopeSonList(parentNode.id).filter(pid => pid.includes(SCOPE_HUB_NODE))
        isChild = cache.scopeIsChildOf(sonNodeId, hubNodeList)
        break;
      default:
        isChild = cache.scopeIsChildOf(sonNodeId, parentNode.id)
        break;
    }

    return isChild
  }

  /**
   * 翻译逻辑块
   */
  public translate(initTranslateQuery: InitTranslateQuery_DTS): string {
    const result: SimpleProcessData[] = this.workFlow2ProcessData(initTranslateQuery)
    this.processData = result

    const {
      rootMethodId = ''
    } = initTranslateQuery

    /**
     * 生成blockly
     */
    const func = {
      id: this.generateUUID(),
      type: 'show_function',
      mutation: {
        funcId: rootMethodId
      },
      value: {
        showFunc: result
      }
    }
    /**
     * 固定参数，禁止调整！！！
     */
    const blockContent = new MixFactory({
      uuid: '',
      render_tree: JSON.stringify(ROOTCOMPONENT),
      mold: 0,
      name: '',
      label: '',
      projectUuid: '',
      terminalUuid: '',
    }).simpleProcessData2BlockDataXml(func)
    return `<xml xmlns="https://developers.google.com/blockly/xml">${blockContent}</xml>`
  }

  /**
   * 根据 MethodWorkFlow_DTS 生成blockly基础数据
   * TODO: 性能优化, 动态加载翻译方法 && 异步串行翻译
   */
  public workFlow2ProcessData(initTranslateQuery: InitTranslateQuery_DTS): SimpleProcessData[] {
    const {
      methodWorkFlow = [],
      cache
    } = initTranslateQuery

    const result: SimpleProcessData[] = []

    /**
     * 翻译所有的块
     */
    methodWorkFlow.forEach((method) => {
      const CurrentService = TranslateBaseService.utils[method.type]
      // 分类翻译
      if (typeof CurrentService === 'function') {
        const currentInstance = new CurrentService({
          method,
          cache
        }) as { result: SimpleProcessData[] }
        result.push(
          ...currentInstance.result
        )
      } else {
        throw new Error(`异常：未配置 ${method.type} 的块翻译！！！`)
      }
    })

    return result
  }
}
