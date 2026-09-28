import { GraphData } from '@antv/g6';
import { find, get, merge, findIndex, filter } from 'lodash';
import {
  TranslateError_DTS,
  MapFromAnchorToSourceNode_DTS,
  ScopeNode_DTS,
  SideQuests_DTS,
  ParamsOptional_PT,
  BlockNames_DTS,
  AnchorTag_DTS,
  AnchorBaseConfig_DTS,
  MethodWorkFlow_DTS,
} from './interface';
import { LogicBlockBaseTplMap, ParamAnchor, SCOPE_HUB_NODE } from './const';
import { TranslateService } from './translate-new/index';
import { INodeConfig } from '../interface/index';
import { CacheService } from './cache-service';

/**
 * 逻辑编辑器翻译服务
 */
export class LogicEditorService {
  /**
   * 查询缓存
   * help
   */
  cache: CacheService;

  /**
   * 方法：主流程
   * help
   */
  methodWorkFlow: MethodWorkFlow_DTS[];

  /**
   * 图表数据
   * help
   */
  graphData: GraphData = { nodes: [], edges: [] };

  /**
   * ！！！blockly 方法描述
   */
  blockly = '';

  /**
   * 翻译错误列表
   */
  translateErrorList: TranslateError_DTS[] = [];

  constructor(graphData: GraphData, rootMethodId: string) {
    try {
      console.time('翻译服务 time');

      this.graphData = graphData;
      this.cache = new CacheService(graphData);
      this.methodWorkFlow = this.generateWorkFlow();

      const _list: ScopeNode_DTS[] = [];
      this.getScopeNodeListFromWrokFlow(this.methodWorkFlow, _list, '');
      this.cache.initScope(_list);

      const translateInstance = new TranslateService({
        methodWorkFlow: this.methodWorkFlow,
        rootMethodId,
        cache: this.cache,
      });
      this.blockly = translateInstance.blockly;
      this.translateErrorList = translateInstance.translateErrorList;
      translateInstance.destroy();

      // 测试代码
      let errorLL = [];
      this.translateErrorList.forEach((item) => {
        const { edge } = item;
        const edgInfo = this.cache.getEdge_FromCache(edge);
        const sourceNode = this.cache.getNode_FromCache(edgInfo.source);
        const targetNode = this.cache.getNode_FromCache(edgInfo.target);
        errorLL.push({
          edgInfo,
          sourceNode,
          targetNode,
        });
      });
      console.log('！！！不合法的连线！！！', errorLL);

      this.resetHelp();
      console.timeLog('翻译服务 time');
    } catch (e) {
      this.resetHelp();
      console.log(e);
      throw e;
    }
  }

  public resetHelp() {
    // console.log('this.blockly \n', this.blockly);
    this.graphData = null;
    this.cache = null;
    this.methodWorkFlow = null;
  }

  /**
   * 逻辑块配置表
   */
  static LogicBlockBaseTplMap = LogicBlockBaseTplMap;

  /**
   * 主流程节点？
   */
  static isFlowAnchor(anchorTag: AnchorTag_DTS): boolean {
    return ParamAnchor.indexOf(anchorTag) === -1;
  }

  /**
   * 获取块的完整定义
   */
  static getLogicBlockConfig(logicNodeName: BlockNames_DTS) {
    return LogicEditorService.LogicBlockBaseTplMap[logicNodeName] || {};
  }

  /**
   * 获取当前锚点的定义 [固定]
   * 输入，输出，固定语法（try-catch）等
   */
  static getFlowAnchorConfig(
    logicNodeName: BlockNames_DTS | string,
    anchorIndex: number,
    config: ParamsOptional_PT<AnchorBaseConfig_DTS>,
  ): AnchorBaseConfig_DTS {
    const defaultAnchorConfig: AnchorBaseConfig_DTS =
      LogicBlockBaseTplMap[logicNodeName]['anchors'][String(anchorIndex)];
    // && LogicEditorService.isFlowAnchor(defaultAnchorConfig.tag)
    if (defaultAnchorConfig) {
      return merge({}, defaultAnchorConfig, config) as AnchorBaseConfig_DTS;
    }
    console.warn(`[${logicNodeName}]-[${anchorIndex}] 锚点数据配置有误，请检查！！！`);
    return {} as AnchorBaseConfig_DTS;
  }

  /**
   * 获取参数类-锚点的定义 [非固定类]
   * PS：例如不固定的 入参 和 出参
   */
  static getParamAnchorConfig(
    logicNodeName: BlockNames_DTS | string,
    config: AnchorBaseConfig_DTS,
  ): AnchorBaseConfig_DTS {
    const mergedConfig = {
      // data: {
      // }
    };
    return merge({}, mergedConfig, config) as AnchorBaseConfig_DTS;
  }

  /**
   * 构建节点的父子关系(用于变量的作用域判断)
   */
  public getScopeNodeListFromWrokFlow(
    workflow: MethodWorkFlow_DTS[],
    list: ScopeNode_DTS[],
    initParentId: string,
  ): any[] {
    const _list: ScopeNode_DTS[] = [];
    //  前一个节点是 后一个节点 的父节点
    workflow.reduce((pre, cur) => {
      _list.push({
        children: [],
        parentNodeId: pre,
        nodeId: cur.nodeId,
        type: cur.type,
        methodInfo: cur,
      });
      return cur.nodeId;
    }, initParentId);

    list.push(..._list);

    _list.forEach((item) => {
      const {
        // parentNodeId,
        nodeId,
        methodInfo,
      } = item;
      const sideQuestsList = Object.keys(methodInfo.sideQuests || {});
      if (!sideQuestsList.length) return;
      sideQuestsList.forEach((sqname) => {
        const _methodWorkFlowMap = methodInfo.sideQuests[sqname];
        _methodWorkFlowMap.forEach((_methodWorkFlow, index) => {
          /**
           * 每个支线任务 需要一个 中间节点  来链接 当前块和支线任务的作用域
           * PS：类似循环体内部出现的临时变量，只有中间节点才可以访问
           */
          const _middle = {
            nodeId: `${SCOPE_HUB_NODE}_${nodeId}_${sqname}_${index}`,
            type: SCOPE_HUB_NODE as BlockNames_DTS,
            map_FromAnchorToSourceNode: {},
            sideQuests: {},
          };
          this.getScopeNodeListFromWrokFlow([_middle, ..._methodWorkFlow], list, nodeId);
        });
      });
    });
    return [];
  }

  /**
   * 支线任务分类（try-catch， 循环 等等）
   */
  public sideQuestsModuleList = Object.values(SideQuests_DTS);

  /**
   * 从“开始块”查找， 到“结束块”结束
   */
  public generateWorkFlow(): MethodWorkFlow_DTS[] {
    const startMethod = this.generateStartMethod();
    const endMethod = this.generateEndMethod();
    const middleMethods: MethodWorkFlow_DTS[] = [];
    this.deepPushMiddleMethods(startMethod, middleMethods);

    if (!middleMethods.length) {
      console.warn('异常: 未连接 “开始块”， 请检查！！！');
    }

    // 是否连接 end 块
    const endBlock = endMethod ? endMethod.nodeId : '';
    const middleEndBlock = get(middleMethods, `[${middleMethods.length - 1}].nodeId`, '') as string;
    if (!endBlock || !middleEndBlock || endBlock !== middleEndBlock) {
      console.warn('异常: 未连接 “结束块”， 请检查！！！');
    }
    return [startMethod, ...middleMethods];
  }

  /**
   * 递归查找-所有的方法块
   * PS: 第一个method不会被推入数组，请注意
   */
  public deepPushMiddleMethods(curMethod: MethodWorkFlow_DTS, middleList: MethodWorkFlow_DTS[]) {
    const { nodeId } = curMethod;

    const curNode = this.cache.getNode_FromCache(nodeId);
    if (!curNode) return;
    const exitAnchor = find(curNode.data.anchors, { data: { _isExit: true } });
    if (!exitAnchor) return;
    const nextNodeId = this.getNextFlowNodeId(curNode);
    if (!nextNodeId) return;
    const nextNode = this.cache.getNode_FromCache(nextNodeId);
    const nextMethod = this.node2Method(nextNode);
    this.generateCreateObjectMethod(nextNode, middleList);
    middleList.push(nextMethod);
    // console.log('查找下一个节点')
    this.deepPushMiddleMethods(nextMethod, middleList);
  }

  /**
   * 生成构建对象块
   * @param node
   * @param middleList
   */
  public generateCreateObjectMethod(node: INodeConfig, middleList: MethodWorkFlow_DTS[]) {
    const objectAnchors = filter(node.data.anchors, { tag: AnchorTag_DTS.VAR_INPUT });
    objectAnchors.forEach((anchor: AnchorBaseConfig_DTS) => {
      const curEdge = this.cache.getRelatedEdgeWithNodeAnchor_FromCache(node.id, anchor.index, false);
      if (!curEdge) {
        return;
      }
      const beforeNode = this.cache.getNode_FromCache(curEdge.source);
      if (!beforeNode || beforeNode.type !== BlockNames_DTS.LOGIC_CREATE_OBJECT_NODE) {
        return;
      }
      this.generateCreateObjectMethod(beforeNode, middleList);
      middleList.push(this.node2Method(beforeNode));
    });
  }

  /**
   * 开始块
   */
  public generateStartMethod(): MethodWorkFlow_DTS {
    const startNode = this.cache.getNode_FromCache(BlockNames_DTS.LOGIC_START_NODE);
    if (!startNode) {
      console.warn('异常：没有开始节点！！！');
      return {} as MethodWorkFlow_DTS;
    }
    return this.node2Method(startNode);
  }

  /**
   * 结束块
   */
  public generateEndMethod(): MethodWorkFlow_DTS {
    const endNode = this.cache.getNode_FromCache(BlockNames_DTS.LOGIC_END_NODE);
    if (!endNode) {
      console.warn('异常：没有结束节点！！！');
      return {} as MethodWorkFlow_DTS;
    }
    return this.node2Method(endNode);
  }

  /**
   * 主流程：上一步（目前只用来找主流程节点： 输入-输出）
   */
  public getPreFlowNodeId(targetNode: INodeConfig): string {
    const anchors = targetNode.data.anchors;
    const exitAnchorIndex = findIndex(anchors, { data: { _isEntry: true } });

    if (exitAnchorIndex === -1 && targetNode.type !== BlockNames_DTS.LOGIC_START_NODE) {
      console.error(`异常：该节点 ${targetNode.type} 没有配置“输入”锚点anchors，请检查！！！`);
      return '';
    }

    // 当前关联的边线
    const curEdge = this.cache.getRelatedEdgeWithNodeAnchor_FromCache(targetNode.id, exitAnchorIndex, false);
    if (!curEdge) return '';

    // 根据边线查找上一个节点
    const preNode = this.cache.getNode_FromCache(curEdge.source);
    return preNode ? preNode.id : '';
  }

  /**
   * 主流程：下一步 （目前只用来找主流程节点：  输入-输出）
   */
  public getNextFlowNodeId(sourceNode: INodeConfig): string {
    const anchors = sourceNode.data.anchors;
    const exitAnchorIndex = findIndex(anchors, { data: { _isExit: true } });

    if (exitAnchorIndex === -1 && sourceNode.type !== BlockNames_DTS.LOGIC_END_NODE) {
      console.error(`异常：该节点 ${sourceNode.type} 没有配置“输出”锚点anchors，请检查！！！`);
      return '';
    }

    // 当前关联的边线
    const curEdge = this.cache.getRelatedEdgeWithNodeAnchor_FromCache(sourceNode.id, exitAnchorIndex, true);
    if (!curEdge) return '';

    // 根据边线查找下一个节点
    const nextNode = this.cache.getNode_FromCache(curEdge.target);
    return nextNode ? nextNode.id : '';
  }

  /**
   * !!!
   * 块数据 =》 构建数据
   */
  public node2Method(iNode: INodeConfig): MethodWorkFlow_DTS {
    const { id: nodeId, type } = iNode;

    const nodeData = iNode.data;
    const anchors = nodeData.anchors;

    let sideQuestsAnchorList: AnchorBaseConfig_DTS[] = [];
    let map_FromAnchorToSourceNode: MapFromAnchorToSourceNode_DTS = {};

    anchors.forEach((anchor) => {
      // 收集支线任务的锚点
      const sideQuestsName = (anchor.data._sideQuests || '') as SideQuests_DTS;
      if (this.sideQuestsModuleList.indexOf(sideQuestsName) !== -1) {
        sideQuestsAnchorList.push(anchor);
      }

      // 收集参数依赖
      const targetIndex = anchor.index;
      const curEdge = this.cache.getRelatedEdgeWithNodeAnchor_FromCache(nodeId, targetIndex, false);
      if (!curEdge) return '';
      const sourceNode = this.cache.getNode_FromCache(curEdge.source);
      const sourceNodeId = sourceNode ? sourceNode.id : '';
      if (sourceNodeId) {
        map_FromAnchorToSourceNode[targetIndex] = {
          edge: curEdge,
          targetNode: iNode,
          sourceNode,
          connnectedAnchorIndex: String(curEdge.sourceAnchor),
        };
      }
    });

    /**
     * 构建基础的MethodWorkFlow_DTS的数据 (后执行: 支线任务的查询)
     */
    const _method = {
      nodeId, // 当前块
      type: type as BlockNames_DTS,
      map_FromAnchorToSourceNode, // 查询锚点关联的节点：source来源
      sideQuests: {}, // 支线任务

      /**
       * 以下是调试属性，仅在开发环境使用
       */
      $__currentNode: iNode,
      // isRoot: type === BlockNames_DTS.LOGIC_START_NODE,
      // isEnd: type === BlockNames_DTS.LOGIC_END_NODE,
      // $__entryNodeId: this.getPreFlowNodeId(iNode), // 上一步的块
      // $__exitNodeId: this.getNextFlowNodeId(iNode), // 下一步的块
    };

    /**
     * 支线任务
     * try-catch， 循环体 等块
     */
    const sideQuests = {};
    sideQuestsAnchorList.forEach((sideQuestsAnchor) => {
      // 支线任务的锚点是否连线
      const edge_SideQuests = this.cache.getRelatedEdgeWithNodeAnchor_FromCache(
        _method.nodeId,
        sideQuestsAnchor.index,
        true,
      );
      if (!edge_SideQuests) return '';

      // 查找支线任务
      const nextNode = this.cache.getNode_FromCache(edge_SideQuests.target);
      const startMethod = this.node2Method(nextNode);
      const middleMethods: MethodWorkFlow_DTS[] = [startMethod];
      this.deepPushMiddleMethods(startMethod, middleMethods);
      const sideQuestsName = sideQuestsAnchor.data._sideQuests;

      /**
       * 二维数组:
       * 1. 支持同类型多个分支的语法（比如 if-else 可以重复多个）
       * 2. 其他不重复的语法，获取二维数组第一个
       */
      if (!sideQuests[sideQuestsName]) {
        sideQuests[sideQuestsName] = [middleMethods];
      } else {
        sideQuests[sideQuestsName].push(middleMethods);
      }
    });
    _method.sideQuests = sideQuests;

    return _method;
  }
}

