import { GraphData, EdgeConfig } from '@antv/g6';
import { find, filter, map } from 'lodash'
import { LogicCache_DTS, ScopeNode_DTS, ScopeQueryCache_DTS } from './interface'
import { assertNodeConfig, INodeConfig } from '../interface/index'

type ValidatedGraphData = Omit<GraphData, 'nodes'> & { nodes: INodeConfig[] }

export class CacheService {
  /**
   * 查询缓存
   */
  logicCache: LogicCache_DTS = { nodes: {}, edges: {}, nodeAnchorToEdgeMap: {} }

  /**
   * 图表数据
   */
  graphData: ValidatedGraphData = { nodes: [], edges: [] }


  /**
   * 所有作用域节点
   */
  scopeNodeList: ScopeNode_DTS[] = []

  /**
   * scope索引映射表
   */
  scopeMaping: Record<string, number> = {}

  /**
   * 父子关系查询缓存
   */
  scopeQueryCache: ScopeQueryCache_DTS = {}


  constructor(graphData: GraphData) {
    const nodes = (graphData.nodes || []).map((node, index) => {
      assertNodeConfig(node, `CacheService graphData.nodes[${index}]`)
      return node
    })
    this.graphData = { ...graphData, nodes }
  }

  /**
   * 设置作用域关系树
   */
  public initScope(nodelist: ScopeNode_DTS[]) {
    this.scopeMaping = nodelist.reduce<Record<string, number>>((acc, el, i) => {
      acc[el.nodeId] = i;
      el.children = []
      return acc;
    }, {});
    nodelist.forEach(el => {
      if (!el.parentNodeId) {
        return;
      }
      const parentEl = nodelist[this.scopeMaping[el.parentNodeId]];
      parentEl.children = [...(parentEl.children || []), el];
    });

    this.scopeNodeList = nodelist
  }

  /**
   * 当前节点能否使用另一个节点的作用域
   */
  public scopeIsChildOf(sonNodeId: string, parentNode: string | string[]): boolean {
    const parentList = this.getScopeParent_FromCache(sonNodeId);
    if (typeof parentNode === 'string') {
      return parentList.includes(parentNode)
    } else {
      return parentNode.some(pid => parentList.includes(pid))
    }
  }

  /**
   * 当前节点的子节点
   */
  public getScopeSonList(nodeId: string): string[] {
    return this.getScopeSon_FromCache(nodeId)
  }


  /**
   * 查找当前节点的儿子节点以及祖先节点
   */
  private updateScopeQueryCache(nodeId: string) {
    let sonList: string[] = []
    let parentList: string[] = []

    sonList = map(
      filter(this.scopeNodeList, { parentNodeId: nodeId }),
      item => item.nodeId
    )

    let currentNode = this.scopeNodeList[this.scopeMaping[nodeId]]
    while (currentNode && currentNode.parentNodeId) {
      parentList.push(currentNode.parentNodeId)
      currentNode = this.scopeNodeList[this.scopeMaping[currentNode.parentNodeId]]
    }

    this.scopeQueryCache[nodeId] = {
      parentList,
      sonList
    }
  }

  /**
   * 查找当前节点的儿子节点
   */
  private getScopeSon_FromCache(nodeId: string): string[] {
    if (!this.scopeQueryCache[nodeId]) {
      this.updateScopeQueryCache(nodeId);
    }
    return this.scopeQueryCache[nodeId].sonList
  }

  /**
   * 查找当前节点的所有祖先节点
   */
  private getScopeParent_FromCache(nodeId: string): string[] {
    if (!this.scopeQueryCache[nodeId]) {
      this.updateScopeQueryCache(nodeId);
    }
    return this.scopeQueryCache[nodeId].parentList
  }

  /**
   * nodeId 查找 块数据
   */
  public getNode_FromCache(nodeId: string): INodeConfig {
    let result: INodeConfig | undefined = this.logicCache.nodes[nodeId]
    if (result) return result
    result = this.graphData.nodes.find((node) => node.id === nodeId)
    if (result) {
      this.logicCache.nodes[nodeId] = result
      return result
    }
    throw new Error(`查询“块[${nodeId}]”不存在，翻译失败`)
  }

  /**
   * 块Id + 锚点Id 查找关联的 边
   */
  public getRelatedEdgeWithNodeAnchor_FromCache(
    nodeId: string,
    anchorIndex: number,
    currentAnchorIsSource = false, // 当前锚点是 “起始点”，还是 “目标点”
  ): EdgeConfig | undefined {

    let nodeName = '';
    let anchorName = '';
    if (currentAnchorIsSource) {
      nodeName = 'source'
      anchorName = 'sourceAnchor'
    } else {
      nodeName = 'target'
      anchorName = 'targetAnchor'
    }

    const mapKey = `${nodeName}-${nodeId}-${anchorName}-${anchorIndex}`
    let result = this.logicCache.nodeAnchorToEdgeMap[mapKey]
    if (result) return result

    const matchQuery = {
      [nodeName]: nodeId,
      [anchorName]: anchorIndex,
    }
    result = find(
      this.graphData.edges,
      matchQuery
    ) as EdgeConfig

    if (result) {
      this.logicCache.nodeAnchorToEdgeMap[mapKey] = result
      return result
    }
    return;
  }

  /**
   * edgId 查找边
   */
  public getEdge_FromCache(edgeId: string): EdgeConfig | undefined {
    let result = this.logicCache.edges[edgeId]
    if (result) return result
    result = find(
      this.graphData.edges,
      { id: edgeId }
    ) as EdgeConfig
    if (result) {
      this.logicCache.edges[edgeId] = result
      return result
    }
    return;
  }

}
