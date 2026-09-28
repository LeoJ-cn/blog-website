import { resolveLogicEditorAsset } from '../icon-map';
import { EdgeConfig, GraphData, IG6GraphEvent, IShape, ModelConfig, ShapeStyle, StateStyles } from '@antv/g6';
import { NodeConfig } from '@antv/g6-core/lib/types';
import { Locales, Log } from '../../compat/locales';
import _ from 'lodash';
import { MethodRecord } from '../../../types/records';
import {
  AnchorBaseConfig_DTS,
  AnchorTag_DTS,
  BlockNames_DTS,
  DescInfo_DTS,
} from '../../service/interface';
import { Method } from '../../../types/method';
import { Data, DataType, Schema } from '../../../types/data';
import dataMixin from '../../compat/data';
import { NodeConfigServicesFactory } from '../../handler/config-builder/node-config-services-factory';
import {
  IApiConfig,
  IFuncNodeConfig,
  INodeConfig,
  IPositon,
  IVarNodeConfig,
  LifeCircleItem,
  LogicTransferData,
} from '../../interface/index';
import { LogicEditorService } from '../../service/logic-service';
import { LOGIC_VARIABLE_EDGE } from '../shape/edges/logic-variable-edge';
import { LOGIC_STATEMENT_EDGE } from './../shape/edges/logic-statement-edge';

const { getParamAnchorConfig, getFlowAnchorConfig } = LogicEditorService;

/**
 * 获取锚点icon
 * @param type 数据类型化
 * @param direction 输入 or 输出
 * @param active 🔗 | 断开🔗
 * @returns 图片
 */
export function getImgByType(type: string, direction: 'in' | 'out' = 'in', active: boolean = false): string {
  const exsit = ['string', 'number', 'boolean', 'object', 'array'].includes(type);
  return resolveLogicEditorAsset(`../img/${direction === 'in' ? `params` : `return`}_${exsit ? type : 'undefined'}${active ? '' : '_inactive'
    }.svg`);
}

/**
 * 根据数据类型获取颜色
 * @param type 数据类型
 * @returns 颜色值
 */
export function getColorByType(type: string) {
  const defaultColor = '#8c8c8c';

  const map = new Map<DataType, string>([
    [DataType.String, '#52C41A'],
    [DataType.Number, '#722ED1'],
    [DataType.Boolean, '#1c87d6'],
    [DataType.Object, '#FA8C16'],
    [DataType.Array, '#13C2C2'],
  ]);

  return map.get(type as DataType) || defaultColor;
}

/**
 * 获取主色的背景色
 * @returns 背景色
 */
export function getBgColorByColor(color: string) {
  const defaultColor = '#CCCCCC';

  const map = new Map<string, string>([
    ['#52C41A', '#D9F7BE'],
    ['#722ED1', '#EFDBFF'],
    ['#1c87d6', '#C4EEFF'],
    ['#FA8C16', '#FFE7BA'],
    ['#13C2C2', '#B5F5EC'],
  ]);

  return map.get(color) || defaultColor;
}

export function method2Graph(methods: Method[]): ModelConfig[] {
  let funcModels: ModelConfig[] = [];
  if (_.isArray(methods) && methods.length) {
    funcModels = methods.map((method: Method) => {
      return method2NodeConfig(method);
    });
  }
  return funcModels;
}
// 校验图数据是否完整
export function validateGraphData(graphData: GraphData): GraphData {
  return _.isObject(graphData) && _.isArray(graphData.nodes) && _.isArray(graphData.edges)
    ? graphData
    : {
      nodes: [],
      edges: [],
    };
}

export function getEgdeStyle(isStatement: boolean, type?: string): ShapeStyle {
  return {
    radius: 6,
    offset: -15,
    lineWidth: isStatement ? 3 : 2,
    stroke: isStatement ? '#1890FF' : getColorByType(type) || '',
    lineAppendWidth: 10, // 防止线太细没法点中
    endArrow: isStatement
      ? null
      : {
        lineDash: [0],
        path: 'M 0,0 L 8,4 L 7,0 L 8,-4 Z',
        d: 0,
        fill: getColorByType(type) || '',
        stroke: getColorByType(type) || '',
      },
    // endArrow: null,
  };
}

export function createEdgeModel(
  cfg: {
    type?: string;
    id?: string;
    source: string;
    target: string;
    sourceAnchor: number;
    targetAnchor: number;
    style?: ShapeStyle;
    stateStyles?: StateStyles;
    varType?: string;
  },
  isStatement = true,
): EdgeConfig {
  const { type, id, source, target, sourceAnchor, targetAnchor, style, stateStyles, varType } = cfg;
  const defalutStyle = getEgdeStyle(isStatement, varType);
  return {
    type: type || LOGIC_VARIABLE_EDGE,
    id: id || `${+new Date() + (Math.random() * 10000).toFixed(0)}`, // edge id
    source,
    target,
    sourceAnchor,
    targetAnchor,
    style: style || defalutStyle,
    stateStyles: stateStyles || {
      'edgeState:default': {
        ...(style || defalutStyle),
      },
      'edgeState:selected': {
        ...(style || defalutStyle),
      },
      'edgeState:hover': {
        ...(style || defalutStyle),
      },
    },
  } as EdgeConfig;
}

export function getRandomNodeId(): string {
  return `${+new Date() + (Math.random() * 10000).toFixed(0)}`;
}

export interface DetailNodeBaseConfig {
  parent_node_id: string;
  parent_node_position: IPositon;
  parent_node_config: {
    label: string;
    name: string;
    value: any;
    _route_path: string;
    _origin_node_id?: string;
    _origin_anchor_index?: number;
    schema?: Schema;
  };
}
/**
 * 获取节点渲染的配置信息
 * @param transferData 拖拽节点携带的数据
 * @param position 拖拽到舞台上的位置
 * @returns 节点的配置
 */
export async function getNodeModel(transferData: string, position: IPositon): Promise<INodeConfig> {
  const data: LogicTransferData = JSON.parse(transferData);
  const nodeType = data.type;
  const s_cfg = data.model;
  const cfg = JSON.parse(s_cfg) as INodeConfig;

  const nodeConfigService = NodeConfigServicesFactory.getINodeConfigService(nodeType);

  return isVariableNode(nodeType)
    ? await nodeConfigService.getConfigAsync(position, cfg, nodeType)
    : nodeConfigService.getConfig(position, cfg);
}

export function data2NodeConfig(data: Data, position?: IPositon): INodeConfig<IVarNodeConfig> {
  const { id, label, name, type, value, schema } = data;

  const _nodeId = getRandomNodeId();
  const nodeType = `logic-${type}-node` as BlockNames_DTS;
  return {
    id: _nodeId,
    x: position ? position.x : 175,
    y: position ? position.y : 284,
    type: nodeType,
    data: {
      varId: id,
      varName: name,
      varLabel: label,
      anchors: [
        getParamAnchorConfig(nodeType, {
          nodeId: _nodeId,
          tag: AnchorTag_DTS.VAR_OUTPUT,
          index: 0,
          data: {
            label,
            value,
            type,
            name,
            _route_path: id,
            schema,
          },
        }),
      ],
    },
  };
}

export function data2Graph(datas: Data[]): GraphData {
  let graph: GraphData = { nodes: [], edges: [] };
  if (_.isArray(datas) && datas.length) {
    graph.nodes = datas.map((data) => data2NodeConfig(data) as NodeConfig);
  }
  return graph;
}

export function isVariableNode(type: BlockNames_DTS) {
  return ['string', 'number', 'boolean', 'array', 'object', 'undefined'] // 变量
    .map((type) => `logic-${type}-node`)
    .includes(type);
}

/**
 *
 * @param method 源数据
 * @param position 位置
 * @returns G6渲染块的完整数据
 */
export function method2NodeConfig(method: Method, position?: IPositon): INodeConfig<IFuncNodeConfig> {
  const {
    id, // funcId
    funcLabel,
    funcName,
    funcReturn,
    parameters,
  } = method;

  const _nodeId = getRandomNodeId();
  const customFuncNode: INodeConfig<IFuncNodeConfig> = {
    id: _nodeId,
    x: position ? position.x : 175,
    y: position ? position.y : 284,
    type: BlockNames_DTS.LOGIC_FUNC_NODE,
    data: {
      funcId: id,
      funcName: funcName,
      funcLabel: funcLabel,
      anchors: [],
    },
  };

  // 固定的开始结束和返回值锚点
  const flowAnchorConfigs: AnchorBaseConfig_DTS[] = [
    // 开始
    getFlowAnchorConfig(BlockNames_DTS.LOGIC_FUNC_NODE, 0, {
      nodeId: _nodeId,
    }),
    // 结束
    getFlowAnchorConfig(BlockNames_DTS.LOGIC_FUNC_NODE, 1, {
      nodeId: _nodeId,
    }),
  ];

  if (funcReturn.state) {
    flowAnchorConfigs.push(
      getParamAnchorConfig(BlockNames_DTS.LOGIC_FUNC_NODE, {
        nodeId: _nodeId,
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: flowAnchorConfigs.length,
        data: {
          value: '',
          uuids: [],
          tag: AnchorTag_DTS.VAR_OUTPUT,
          type: funcReturn.type || DataType.Undefined,
          label: '返回值',
        },
      }),
    );
  }

  // 不固定的参数锚点
  const paramAnchorConfigs: AnchorBaseConfig_DTS[] = _.map<Data, AnchorBaseConfig_DTS>(
    parameters,
    (param: Data, index: number) => {
      const order = index + flowAnchorConfigs.length;
      return getParamAnchorConfig(BlockNames_DTS.LOGIC_FUNC_NODE, {
        nodeId: _nodeId,
        tag: AnchorTag_DTS.VAR_INPUT,
        index: order,
        data: {
          value: param.value,
          uuids: [],
          tag: AnchorTag_DTS.VAR_INPUT,
          label: param.label,
          name: param.name,
          type: param.type,
        },
      });
    },
  );

  customFuncNode.data.anchors = [...flowAnchorConfigs, ...paramAnchorConfigs];

  return customFuncNode;
}

export function service2NodeConfig(api: MethodRecord, position?: IPositon): INodeConfig<IApiConfig> {
  const _nodeId = getRandomNodeId();
  const customApiNode: INodeConfig<any> = {
    id: _nodeId,
    x: position ? position.x : 175,
    y: position ? position.y : 284,
    type: BlockNames_DTS.LOGIC_API_NODE,
    data: {
      api,
      anchors: [],
    },
  };

  // 固定的开始结束和返回值锚点
  const flowAnchorConfigs: AnchorBaseConfig_DTS[] = [
    // 开始
    getFlowAnchorConfig(BlockNames_DTS.LOGIC_API_NODE, 0, {
      nodeId: _nodeId,
    }),
    // 结束
    getFlowAnchorConfig(BlockNames_DTS.LOGIC_API_NODE, 1, {
      nodeId: _nodeId,
    }),
  ];

  const realization = JSON.parse(api.realization);

  if (realization.isReturn) {
    flowAnchorConfigs.push(
      getParamAnchorConfig(BlockNames_DTS.LOGIC_API_NODE, {
        nodeId: _nodeId,
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: flowAnchorConfigs.length,
        data: {
          value: dataMixin.getDefaultValueJSONFromSchema(realization.returnSchem),
          uuids: [],
          tag: AnchorTag_DTS.VAR_OUTPUT,
          type: realization.returnSchema.type,
          label: '返回值',
        },
      }),
    );
  }

  // 不固定的参数锚点
  const parameters = JSON.parse(api.props);
  const paramAnchorConfigs: AnchorBaseConfig_DTS[] = _.map<Data, AnchorBaseConfig_DTS>(
    parameters.slice(0, -1),
    (param: any, index: number) => {
      const order = index + flowAnchorConfigs.length;
      return getParamAnchorConfig(BlockNames_DTS.LOGIC_API_NODE, {
        nodeId: _nodeId,
        tag: AnchorTag_DTS.VAR_INPUT,
        index: order,
        data: {
          value: param.value || dataMixin.getDefaultValueJSONFromSchema(param.schema),
          uuids: [],
          tag: AnchorTag_DTS.VAR_INPUT,
          label: param.label,
          name: param.key,
          type: param.schema.type,
        },
      });
    },
  );

  customApiNode.data.anchors = [...flowAnchorConfigs, ...paramAnchorConfigs];

  return customApiNode;
}

export function getCustomMethodDataConfig(nodeId: string, method: Method) {
  const {
    id, // funcId
    funcLabel,
    funcName,
    funcReturn,
    parameters,
  } = method;
  const data = {
    funcId: id,
    funcName: funcName,
    funcLabel: funcLabel,
    anchors: [],
  };

  // 固定的开始结束和返回值锚点
  const flowAnchorConfigs: AnchorBaseConfig_DTS[] = [
    // 开始
    getFlowAnchorConfig(BlockNames_DTS.LOGIC_FUNC_NODE, 0, {
      nodeId,
    }),
    // 结束
    getFlowAnchorConfig(BlockNames_DTS.LOGIC_FUNC_NODE, 1, {
      nodeId,
    }),
  ];

  // 返回值
  if (funcReturn.state) {
    flowAnchorConfigs.push(
      getParamAnchorConfig(BlockNames_DTS.LOGIC_FUNC_NODE, {
        nodeId,
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: flowAnchorConfigs.length,
        data: {
          _desc: DescInfo_DTS.RETURN_VALUE,
          value: dataMixin.getDefaultValueJSONFromSchema(funcReturn.schema as Schema),
          schema: funcReturn.schema as Schema,
          uuids: [],
          tag: AnchorTag_DTS.VAR_OUTPUT,
          type: funcReturn.type || DataType.Undefined,
          label: '返回值',
        },
      }),
    );
  }

  // 不固定的参数锚点
  const paramAnchorConfigs: AnchorBaseConfig_DTS[] = _.map<Data, AnchorBaseConfig_DTS>(
    parameters,
    (param: Data, index: number) => {
      const order = index + flowAnchorConfigs.length;
      return getParamAnchorConfig(BlockNames_DTS.LOGIC_FUNC_NODE, {
        nodeId,
        tag: AnchorTag_DTS.VAR_INPUT,
        index: order,
        data: {
          value: param.value,
          uuids: [],
          tag: AnchorTag_DTS.VAR_INPUT,
          label: param.label,
          name: param.name,
          type: param.type,
        },
      });
    },
  );

  data.anchors = [...flowAnchorConfigs, ...paramAnchorConfigs];
  return data;
}

export function getMergeGraph(oldData: GraphData, newData: GraphData) {
  // ! 用旧的位置信息覆盖新的位置信息
}

/**
 * 是否点击了【方法详情】
 * @param e
 */
export function isClickMethodDetial(e: IG6GraphEvent) {
  const shape = e.target as IShape;
  const shapeName = shape.get('name');
  if (shapeName === 'funcDetail') {
    return true;
  }
  return false;
}

export function isClickApiHelper(e: IG6GraphEvent) {
  const shape = e.target as IShape;
  const shapeName = shape.get('name');
  if (shapeName === 'api-help-icon') {
    return true;
  }
  return false;
}

/**
 * 渲染生命周期方法为图数据
 * @param lifeCircles 生命周期
 * @returns
 */
export function lifeCycleMethod2Graph(lifeCircles: LifeCircleItem[]): GraphData {
  const graphData: GraphData = { nodes: [], edges: [] };

  // 生命周期块
  const lifeCycleCfg = NodeConfigServicesFactory.getINodeConfigService(BlockNames_DTS.LOGIC_LIFECYCLE_NODE).getConfig({
    x: 220,
    y: 140,
  });

  lifeCycleCfg.data.anchors.forEach((anchor, index) => {
    const lifes = lifeCircles.filter((item: LifeCircleItem) => item.type === anchor.data.value);
    const graph = method2Graph(lifes.map((c) => c.method)) as NodeConfig[];

    if (graph.length) {
      _.forEach(graph, (node, index) => {
        node.x = 500 + 300 * index;
        node.y = 140 + index * 250;
      });

      graphData.nodes.push(...graph);
      // 创建边
      const edges = [];
      for (let index = 0; index < graph.length; index++) {
        const cur = graph[index];
        const next = graph[index + 1];
        if (next) {
          const edge = createEdgeModel({
            type: LOGIC_STATEMENT_EDGE,
            id: getRandomNodeId(),
            source: cur.id,
            target: next.id,
            sourceAnchor: 1,
            targetAnchor: 0,
          });
          edges.push(edge);
        }
      }
      graphData.edges.push(
        createEdgeModel({
          type: LOGIC_STATEMENT_EDGE,
          id: getRandomNodeId(),
          source: BlockNames_DTS.LOGIC_LIFECYCLE_NODE,
          target: graph[0].id,
          sourceAnchor: index, // 生命周期 - 页面创建时
          targetAnchor: 0,
        }),
        ...edges,
      );
    }
  });

  graphData.nodes.unshift(lifeCycleCfg as NodeConfig);
  return graphData;
}

/**
 * 方法列表 - 渲染除生命周期其他的函数
 * @param lifeCircles 生命周期钩子函数
 * @param methods 所有的函数
 */
export function customMethod2Graph(lifeCircles: LifeCircleItem[], methods: Method[]): GraphData {
  const lifeCirclyIds = lifeCircles.map((i) => i.method.id);
  // 剔除掉生命周期方法
  methods = methods.filter((m) => !lifeCirclyIds.includes(m.id));
  const nodes = method2Graph(methods) as NodeConfig[];
  nodes.forEach((item, index) => {
    item.x = 220;
    item.y = 400 + index * 250;
  });
  return {
    nodes,
    edges: [],
  };
}

export function getVariableGraph(allDatas: Data[]): GraphData {
  const graph = data2Graph(allDatas.filter((data) => data.category === 'page'));
  graph.nodes.forEach((node, index) => {
    node.x = 115 + 165 * index;
    node.y = 65;
  });
  return graph;
}

/**
 * 构建方法列表GraphData
 * @param lifeCircles 生命周期
 * @param methodList 方法列表
 * @returns
 */
export function getMethodListGraph(lifeCircles: LifeCircleItem[], methodList: Method[]): GraphData {
  let methodListGraph: GraphData = {
    nodes: [],
    edges: [],
  };

  const lifeCycleGraphData = lifeCycleMethod2Graph(lifeCircles);
  const customMethodGraphData = customMethod2Graph(lifeCircles, methodList);
  methodListGraph.nodes = [...lifeCycleGraphData.nodes, ...customMethodGraphData.nodes];
  methodListGraph.edges = [...lifeCycleGraphData.edges, ...customMethodGraphData.edges];
  return methodListGraph;
}

/**
 * 构建一个自定义方法的GraphData
 */
export function getMethodDetialGraphData(method: Method, cache?: GraphData) {
  // 该方法存在图数据
  if (!cache && method.graphData) {
    console.log('method.graphData', JSON.parse(method.graphData));
    cache = JSON.parse(method.graphData);
  }

  if (!cache) {
    /**************** 构建一个空的自定义方法的图数据 ********************** */
    // ! 添加开始和结束
    // const graphData = validateGraphData(detail);
    cache = {
      nodes: [],
      edges: [],
    };

    // ! 构建开始
    const { getParamAnchorConfig, getFlowAnchorConfig } = LogicEditorService;
    const startNode: INodeConfig = {
      id: BlockNames_DTS.LOGIC_START_NODE, // 当前页面唯一
      x: 175,
      y: 284,
      type: BlockNames_DTS.LOGIC_START_NODE,
      data: {
        anchors: [],
      },
    };
    // ! 构建结束
    const endNode: INodeConfig = {
      type: BlockNames_DTS.LOGIC_END_NODE, // 当前页面唯一
      id: BlockNames_DTS.LOGIC_END_NODE,
      x: 740,
      y: 284,
      data: {
        anchors: [],
      },
    };
    cache.nodes.push(startNode as NodeConfig);
    cache.nodes.push(endNode as NodeConfig);
    const edge = createEdgeModel(
      {
        type: LOGIC_STATEMENT_EDGE,
        id: `${+new Date() + (Math.random() * 10000).toFixed(0)}`,
        source: BlockNames_DTS.LOGIC_START_NODE,
        target: BlockNames_DTS.LOGIC_END_NODE,
        sourceAnchor: 0,
        targetAnchor: 0, // 一定是0
        varType: '',
      },
      true,
    );
    cache.edges.push(edge);
  }
  const startNode = cache.nodes.find((i) => i.id === BlockNames_DTS.LOGIC_START_NODE) as INodeConfig;
  const endNode = cache.nodes.find((i) => i.id === BlockNames_DTS.LOGIC_END_NODE) as INodeConfig;
  const { parameters, funcReturn } = method;

  const flowAnchorConfigs: AnchorBaseConfig_DTS[] = [
    getFlowAnchorConfig(BlockNames_DTS.LOGIC_START_NODE, 0, {
      nodeId: BlockNames_DTS.LOGIC_START_NODE,
      connected: true,
    }),
  ];
  const paramAnchorConfigs: AnchorBaseConfig_DTS[] = _.map<Data, AnchorBaseConfig_DTS>(
    parameters,
    (param: Data, index: number) => {
      const order = index + flowAnchorConfigs.length;
      return getParamAnchorConfig(BlockNames_DTS.LOGIC_START_NODE, {
        nodeId: BlockNames_DTS.LOGIC_START_NODE,
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: order,
        connected: false,
        data: {
          value: param.value,
          uuids: [],
          tag: AnchorTag_DTS.VAR_OUTPUT,
          label: param.label,
          type: param.type,
          name: param.name,
          schema: param.schema,
        },
      });
    },
  );
  startNode.data.anchors = [...flowAnchorConfigs, ...paramAnchorConfigs];
  endNode.data.anchors = [
    getFlowAnchorConfig(BlockNames_DTS.LOGIC_END_NODE, 0, {
      nodeId: BlockNames_DTS.LOGIC_END_NODE,
      connected: true,
    }),
  ];

  if (funcReturn.state) {
    // 是否需要返回值
    const returnParam = getParamAnchorConfig(BlockNames_DTS.LOGIC_END_NODE, {
      nodeId: BlockNames_DTS.LOGIC_END_NODE,
      tag: AnchorTag_DTS.VAR_INPUT,
      index: 1,
      connected: true,
      data: {
        tag: AnchorTag_DTS.VAR_INPUT,
        type: funcReturn.type || DataType.String,
        label: '返回值',
        name: 'return_value',
        schema: funcReturn.schema as Schema,
      },
    });
    endNode.data.anchors.push(returnParam);
  }

  return cache;
}

export function integeGraphData(oldData: GraphData, newData: GraphData): GraphData {
  const startNode = _.find(
    newData.nodes,
    (newNode: INodeConfig) => newNode.type === BlockNames_DTS.LOGIC_START_NODE,
  ) as INodeConfig;
  const endNode = _.find(
    newData.nodes,
    (newNode: INodeConfig) => newNode.type === BlockNames_DTS.LOGIC_END_NODE,
  ) as INodeConfig;

  const oldNodes = oldData.nodes as INodeConfig[];
  _.forEach(oldNodes, (oldNode: INodeConfig) => {
    if (oldNode.type === BlockNames_DTS.LOGIC_START_NODE) {
      Object.assign(oldNode, { ...startNode, id: oldNode.id });
    }

    if (oldNode.type === BlockNames_DTS.LOGIC_END_NODE) {
      Object.assign(oldNode, { ...endNode, id: oldNode.id });
    }
  });

  return oldData;
}

/**
 * 判断数据类型，只判断基础类型
 * @param data 待判断的数据
 */
export function getDataType(data: any) {
  if (_.isArray(data)) {
    return 'array';
  }

  return typeof data;
}

/**
 * 获取节点块文本的长度
 * @param value
 * @return 内容的长度
 */
export function getNodeTextSize(value: string): number {
  if (!value) {
    return 0;
  }
  const charCount = value.split('').reduce((prev, curr) => {
    if (/[a-z]|[0-9]|[,;.!@#-+/\\$%^*()<>?:"'{}~]/i.test(curr)) {
      return prev + 0.6;
    }
    return prev + 1;
  }, 0);

  // 向上取整，防止出现半个字的情况
  return Math.ceil(charCount);
}

/**
 * 是否是英文环境
 */
export function isEn() {
  return Locales.getLanguage() === 'en-US';
}

/**
 * 根据数据类型获取默认值
 * @param type 数据类型
 * @returns
 */
export function getDefaultValueByType(type: DataType) {
  const defaultValue = '';

  const map = new Map<DataType, any>([
    [DataType.String, ''],
    [DataType.Number, 0],
    [DataType.Boolean, false],
    [DataType.Object, {}],
    [DataType.Array, []],
  ]);

  return map.get(type as DataType) || defaultValue;
}
