import { LOGIC_STATEMENT_EDGE } from './../graph/shape/edges/logic-statement-edge';
import { EdgeConfig, IEdge, IShapeBase } from '@antv/g6';
import { INode } from '@antv/g6-core/lib/interface/item';
import { IG6GraphEvent, Item } from '@antv/g6-core/lib/types';
import _ from 'lodash';
import { DataType, Schema } from '../../types/data';
import { Method } from '../../types/method';
import methodMixin from '../compat/method';
import { createEdgeModel, getNodeModel, isClickApiHelper, isClickMethodDetial, isVariableNode } from '../graph/util';
import { AnchorTag, IApiConfig, IFuncNodeConfig, IIGroup, INodeConfig, IPositon, StageMode } from '../interface';
// Vue 3 Options API 组件实例由事件层按原字段协议访问；运行时不依赖组件构造函数。
type LogicEditorStage = any;
import { BlockNames_DTS, ConstOrVariable_DTS } from './../service/interface';
import { NodeConfigServicesFactory } from './config-builder/node-config-services-factory';
import dataMixin from '../compat/data';
import { LOGIC_VARIABLE_EDGE } from '../graph/shape/edges/logic-variable-edge';
import { GraphUtil } from '../graph/graph-util';
import { Log } from '../compat/locales';
import { Store } from '../compat/store';

export async function onDrop(vm: LogicEditorStage, e: IG6GraphEvent) {
  const originalEvent = e.originalEvent as DragEvent;
  if (originalEvent.dataTransfer) {
    const transferData = originalEvent.dataTransfer.getData('dragComponent');
    if (transferData) {
      await addNode(vm, transferData, { x: e.x, y: e.y });
    }
  }
}

export async function addNode(vm: LogicEditorStage, transferData: string, position: IPositon) {
  const model = await getNodeModel.call(vm, transferData, position);
  vm.graph.addItem('node', model, true);
}

/**
 * 保存当前方法详情的图数据
 */
export function saveCurMethodDetialGraphData(vm: LogicEditorStage) {
  if (vm.stageMode === StageMode.METHOD_DETAIL) {
    // 方法详情
    const methodGraphDarta = vm.graph.save();
    const curEditMethod = vm.curEditMethod; // 当前编辑的方法
    methodMixin.changeMethodById(curEditMethod.id, {
      ...curEditMethod,
      graphData: JSON.stringify(methodGraphDarta),
    });
  }
}

/**
 * 选中一个节点
 * @param vm LogicEditorStage 实例
 * @param e G6Event
 */
export function onAfterNodeSelectedDrop(vm: LogicEditorStage, e: IG6GraphEvent) {
  vm.curSelectedNodeConfig = null;
  if (e && e.item) {
    vm.curSelectedNode = e.item; // 当前选中的节点
    const model = e.item.get<INodeConfig>('model');
    vm.curSelectedNodeConfig = model; // 元数据
    vm.$emit('select-node', model);
    if (vm.stageMode === StageMode.METHOD_LIST) {
      if (vm.curSelectedNodeConfig.type === BlockNames_DTS.LOGIC_FUNC_NODE) {
        const method = _.find<Method>(
          vm.methodList,
          (m: Method) => m.id === (vm.curSelectedNodeConfig as INodeConfig<IFuncNodeConfig>).data.funcId,
        );
        vm.curEditMethod = _.cloneDeep(method);
        methodMixin.changeCurMethodId(method.id); // 全局记录一下当前编辑的方法ID
        methodMixin.changeCurMethod(vm.curEditMethod); // 这个方法内部会读取当前编辑的方法id,所以要先设置方法id
      }
    }
    if (isClickMethodDetial(e)) {
      vm.$emit('change-graph', StageMode.METHOD_DETAIL);
      vm.$emit('select-node', null);
    }

    if (isClickApiHelper(e)) {
      const getHelpApi = (item: any) => {
        const { label, name, props, realization } = item;

        function getOldSchema(schema: any): any {
          const targetSchema = {};
          function reverse(source: any, target: any) {
            if (source.type === 'object') {
              target.type = 'object';
              target.properties = _.cloneDeep(
                source.properties.reduce((res: any, item: any) => {
                  item.description = item.label;
                  res[item.key] = item;
                  return res;
                }, {}),
              );
              Array.isArray(source.properties) &&
                source.properties.map((p: any) => {
                  reverse(p, target.properties[p.key]);
                });
            } else if (source.type === 'array') {
              target.type = 'array';
              if (!target.items) {
                target.items = {};
              }
              reverse(source.items, target.items);
            }
          }
          reverse(schema, targetSchema);
          return targetSchema;
        }
        try {
          const params = JSON.parse(props);
          const returns = JSON.parse(realization);
          const newSchema = returns.returnSchema;
          let api = null;
          if (item.mold === 4) {
            let oldResSchema = {};
            if (newSchema.type === 'object') {
              oldResSchema = getOldSchema(newSchema);
            }
            api = {
              [name]: {
                [returns.requestMethod]: {
                  description: label,
                  parameters: params.map((p: any) => {
                    let res: Record<string, any> = {
                      name: p.key,
                      type: p.schema.type,
                      in: p.locateIn,
                      description: p.label,
                      required: !!p.required,
                    };
                    if (p.schema.type === 'object' || p.schema.type === 'array') {
                      const oldParamsSchema = getOldSchema(p.schema);
                      res.schema = oldParamsSchema;
                    }
                    return res;
                  }),
                  responses: {
                    1: {
                      description: '正确返回',
                      schema: oldResSchema,
                    },
                  },
                },
              },
            };
          }

          return api;
        } catch (e) {
          Log.error('graph/util/index.ts', 'api定义不合法');
        }
      };

      const model = e.item.getModel();
      const api = _.get(model, 'data.api');
      if (api) {
        vm.api = getHelpApi(api);
        vm.showHelperModal = true;
      }
    }
  }
}

export function onCanvasClick(vm: LogicEditorStage) {
  vm.curSelectedNodeConfig = null;
  vm.curSelectedNode = null;
  vm.$emit('select-node', vm.curSelectedNodeConfig);
}

export function onCanvasMouseLeave(vm: LogicEditorStage, e: IG6GraphEvent) {
  vm.graph.getNodes().forEach((node) => {
    const group = node.getContainer() as IIGroup;
    group.clearAnchor();
    node.clearStates('anchorActived');
  });
}

export function onNodeDragend(vm: LogicEditorStage, e: IG6GraphEvent) {
  if (e && e.item) {
    const model = e.item.get<INodeConfig>('model');
    vm.curSelectedNodeConfig = model;
    vm.$emit('select-node', model);
    saveCurMethodDetialGraphData(vm);
  }
}

export function onBeforeEdgeAdd(
  vm: LogicEditorStage,
  data: {
    source: INode;
    target: INode;
    sourceAnchor: number;
    targetAnchor: number;
  },
) {
  const { source, target, sourceAnchor, targetAnchor } = data;
  // const sourceAnchorData = ((source as INode).getContainer() as IIGroup).getAllAnchorBg()[sourceAnchor as number]
  //   .cfg.anchorData;
  const sourceAnchorData = (source._cfg.model.data as any).anchors[sourceAnchor];
  const targetAnchorData = ((target as any).getContainer() as IIGroup).getAllAnchorBg()[targetAnchor as number].cfg
    .anchorData;

  // ! 相同TAG不能连接
  const condition1 = sourceAnchorData.tag === targetAnchorData.tag;
  if (condition1) {
    return;
  }
  // ! 同一类TAG才能连接
  const condition2 = (sourceAnchorData.tag as string).split('_')[0] === (targetAnchorData.tag as string).split('_')[0];
  if (!condition2) {
    return;
  }
  // ! 同一类不可以反向连接
  const condition3 = condition2 && (targetAnchorData.tag as string).split('_')[1] === 'output';
  if (condition3) {
    return;
  }
  // ! 数据类型，type相同才可以连接
  if (sourceAnchorData.tag === AnchorTag.VAR_OUTPUT && targetAnchorData.tag === AnchorTag.VAR_INPUT) {
    if ([sourceAnchorData.data.type, targetAnchorData.data.type].includes('undefined')) {
    } else {
      if (sourceAnchorData.data.type !== targetAnchorData.data.type) {
        return;
      }
    }
  }

  const isStatement = sourceAnchorData.tag === AnchorTag.STATEMENT_OUTPUT;
  if (!isStatement && targetAnchorData.data.constOrVariable) {
    targetAnchorData.data.constOrVariable = ConstOrVariable_DTS.USE_VARIABLE;
  }
  vm.graph.addItem(
    'edge',
    createEdgeModel(
      {
        type: isStatement ? LOGIC_STATEMENT_EDGE : LOGIC_VARIABLE_EDGE,
        id: `${+new Date() + (Math.random() * 10000).toFixed(0)}`,
        source: (source as any).get('id'),
        target: target.get('id'),
        sourceAnchor: sourceAnchor as number,
        targetAnchor: targetAnchor as number,
        varType: sourceAnchorData.data.type,
      },
      isStatement,
    ),
    true,
  );

  const sourceCfg = source.getModel() as INodeConfig;
  const targetCfg = target.getModel() as INodeConfig;
  sourceCfg.data.anchors[sourceAnchor].connected = true;
  targetCfg.data.anchors[targetAnchor].connected = true;
  source.update(sourceCfg);
  target.update(targetCfg);
}

export function onAfterEdgeSelected(vm: LogicEditorStage, e: IG6GraphEvent) {
  if (e && e.item) {
    vm.curSelectedNode = e.item;
  }
}

/**
 * 画布缩放监听回调
 * @param e
 */
export function onCanvasWheelzoom(vm: LogicEditorStage, e: IG6GraphEvent) {
  e.stopPropagation();

  const scaling = vm.graph.getZoom();
  const tooltips = Array.from(vm.$el.getElementsByClassName('ivu-poptip-popper')) as HTMLElement[];
  if (tooltips && tooltips.length) {
    tooltips.forEach((tooltip) => {
      if (tooltip && tooltip.style) {
        tooltip.style.transform = `scale(${scaling})`;
      }
    });
  }
}

export function onAfterNodeDblclick(vm: LogicEditorStage, e: IG6GraphEvent) {
  if (!e || !e.item) {
    return;
  }

  const shape = e.target as IShapeBase;
  if (!shape) {
    return;
  }

  const graph = vm.graph;
  const model = e.item.get<INodeConfig>('model');
  const isVariableNodeClick = isVariableNode(model.type as BlockNames_DTS);
  const isVarDetialNodeClick = BlockNames_DTS.LOGIC_VARIABLE_DETIAL_NODE === model.type;
  const isArrayForeachItem = BlockNames_DTS.LOGIC_ARRAY_FOREACH_NODE === model.type && shape.get('name') === 'item';

  const addVariableDetail = (objectConfig: any, anchor_index?: number) => {
    // 根据该锚点挂载的数据生成数据详情块的nodeConfig配置
    const nodeConfigService = NodeConfigServicesFactory.getINodeConfigService(
      BlockNames_DTS.LOGIC_VARIABLE_DETIAL_NODE,
    );
    // 如果已经存在
    if (graph.findById(model.id + '_' + objectConfig.name)) {
      return;
    }
    const detailConfig = nodeConfigService.getVarDetialConfig({
      parent_node_id: model.id,
      parent_node_position: {
        x: model.x,
        y: model.y,
      },
      parent_node_config: {
        _origin_node_id: objectConfig._origin_node_id || model.data._origin_node_id,
        _origin_anchor_index: objectConfig._origin_anchor_index || model.data._origin_anchor_index,
        _route_path: objectConfig._route_path,
        name: objectConfig.name,
        label: objectConfig.label,
        value: objectConfig.value,
        schema: objectConfig.schema,
      },
    });
    graph.addItem('node', detailConfig, true);
    graph.addItem(
      'edge',
      createEdgeModel(
        {
          type: LOGIC_VARIABLE_EDGE,
          id: `${+new Date() + (Math.random() * 10000).toFixed(0)}`,
          source: model.id,
          target: detailConfig.id,
          sourceAnchor: anchor_index || shape.attr().anchor_index,
          targetAnchor: 0,
          varType: 'object',
        },
        false,
      ),
      true,
    );
  };

  // 变量或者变量详情块的对象可以展开
  if (isVariableNodeClick || isVarDetialNodeClick) {
    const _object_config = shape.attr()._object_config;
    if (_.isObject(_object_config)) {
      const _object_config = shape.attr()._object_config;
      if (_object_config.type !== DataType.Object) {
        return;
      }
      addVariableDetail(_object_config);
    }
  }
  // 方法返回展开逻辑
  if (
    vm.stageMode !== StageMode.METHOD_LIST &&
    model.type === BlockNames_DTS.LOGIC_FUNC_NODE &&
    shape.get('name') === 'return'
  ) {
    const method = methodMixin.getMethodById((model.data as any).funcId);
    if (method.funcReturn.state && method.funcReturn.type === DataType.Object) {
      let value = {};
      try {
        value = JSON.parse(dataMixin.getDefaultValueJSONFromSchema(method.funcReturn.schema as any));
      } catch (error) {}
      // 根据该锚点挂载的数据生成数据详情块的nodeConfig配置
      addVariableDetail(
        {
          label: method.funcLabel,
          name: method.funcName,
          value,
          schema: method.funcReturn.schema,
          _route_path: 'func',
          _origin_node_id: model.id,
          _origin_anchor_index: 2,
        },
        2,
      );
    }
  }
  // 开始节点参数展开
  if (
    vm.stageMode !== StageMode.METHOD_LIST &&
    model.type === BlockNames_DTS.LOGIC_START_NODE &&
    shape.get('name') === 'param'
  ) {
    const anchorIndex = model.data.anchors.findIndex((i) => i.data.name === shape.get('param'));
    const paramAnchor = model.data.anchors[anchorIndex];
    if (paramAnchor && paramAnchor.data.schema && paramAnchor.data.type === DataType.Object) {
      addVariableDetail(
        {
          label: paramAnchor.data.label,
          name: paramAnchor.data.name,
          value: dataMixin.getDefaultValueJSONFromSchema(paramAnchor.data.schema),
          schema: paramAnchor.data.schema,
          _origin_node_id: model.id,
          _origin_anchor_index: anchorIndex,
        },
        anchorIndex,
      );
    }
  }
  // API返回值展开
  if (
    vm.stageMode !== StageMode.METHOD_LIST &&
    model.type === BlockNames_DTS.LOGIC_API_NODE &&
    shape.get('name') === 'return'
  ) {
    const realization = JSON.parse((model as INodeConfig<IApiConfig>).data.api.realization);
    if (realization && realization.returnSchema.type === DataType.Object) {
      let value = {};
      try {
        value = JSON.parse(dataMixin.getDefaultValueJSONFromSchema(realization.returnSchema));
      } catch (error) {}
      // 根据该锚点挂载的数据生成数据详情块的nodeConfig配置
      addVariableDetail(
        {
          label: realization.returnLabel,
          name: realization.returnLabelLocale,
          value,
          schema: realization.returnSchema,
          _route_path: 'api',
          _origin_node_id: model.id,
          _origin_anchor_index: 2,
        },
        2,
      );
    }
  }
  // 数组循环的项展开
  if (isArrayForeachItem) {
    const itemAnchor = model.data.anchors[5];
    if (itemAnchor && itemAnchor.data.schema && itemAnchor.data.type === DataType.Object) {
      addVariableDetail(
        {
          label: 'item',
          name: 'item',
          value: itemAnchor.data.value,
          schema: itemAnchor.data.schema,
          _origin_node_id: model.id,
          _origin_anchor_index: 5,
        },
        5,
      );
    }
  }

  const addCreateObject = (config: { name: string; label: string; value: any; schema: Schema }) => {
    const nodeConfigService = NodeConfigServicesFactory.getINodeConfigService(BlockNames_DTS.LOGIC_CREATE_OBJECT_NODE);
    const detailConfig = nodeConfigService.getVarDetialConfig({
      parent_node_id: model.id,
      parent_node_position: {
        x: model.x,
        y: model.y,
      },
      parent_node_config: {
        _route_path: undefined,
        name: config.name,
        label: config.label,
        value: config.value,
        schema: config.schema,
      },
    });
    graph.addItem('node', detailConfig, true);
    graph.addItem(
      'edge',
      createEdgeModel(
        {
          type: LOGIC_VARIABLE_EDGE,
          id: `${+new Date() + (Math.random() * 10000).toFixed(0)}`,
          source: detailConfig.id,
          target: model.id,
          sourceAnchor: 0,
          targetAnchor: shape.attr().anchor_index,
          varType: 'object',
        },
        false,
      ),
      true,
    );
  };
  // 方法参数 展开逻辑
  if (
    vm.stageMode !== StageMode.METHOD_LIST &&
    model.type === BlockNames_DTS.LOGIC_FUNC_NODE &&
    shape.get('name') === 'param'
  ) {
    const method = methodMixin.getMethodById((model.data as any).funcId);
    const param = method && method.parameters.find((i) => i.name === shape.get('key'));
    if (param && param.type === DataType.Object) {
      let value = {};
      try {
        value = dataMixin.getDefaultValueJSONFromSchema(param.schema);
      } catch (error) {}
      // 根据该锚点挂载的数据生成数据详情块的nodeConfig配置
      addCreateObject({ label: param.label, name: param.name, value, schema: param.schema });
    }
  }
  // 结束节点返回值展开
  if (
    vm.stageMode !== StageMode.METHOD_LIST &&
    model.type === BlockNames_DTS.LOGIC_END_NODE &&
    shape.get('name') === 'return'
  ) {
    const returnAnchor = model.data.anchors[1];
    if (returnAnchor && returnAnchor.data.type === DataType.Object) {
      // 根据该锚点挂载的数据生成数据详情块的nodeConfig配置
      addCreateObject({
        label: returnAnchor.data.label,
        name: returnAnchor.data.name,
        value: dataMixin.getDefaultValueJSONFromSchema(returnAnchor.data.schema),
        schema: returnAnchor.data.schema,
      });
    }
  }
  // API参数 展开逻辑
  if (
    vm.stageMode !== StageMode.METHOD_LIST &&
    model.type === BlockNames_DTS.LOGIC_API_NODE &&
    shape.get('name') === 'param'
  ) {
    const params = JSON.parse((model as INodeConfig<IApiConfig>).data.api.props) || [];
    const param = params.find((i) => i.key === shape.get('key'));
    if (param && param.schema.type === DataType.Object) {
      let value = {};
      try {
        if (param.value) {
          value = JSON.parse(param.value);
        } else {
          value = JSON.parse(dataMixin.getDefaultValueJSONFromSchema(param.schema));
        }
      } catch (error) {}
      // 根据该锚点挂载的数据生成数据详情块的nodeConfig配置
      addCreateObject({ label: param.label, name: param.key, value, schema: param.schema });
    }
  }
  // 设置数组项 展开逻辑
  if (
    vm.stageMode !== StageMode.METHOD_LIST &&
    model.type === BlockNames_DTS.LOGIC_SET_ARRAY_ITEM_NODE &&
    shape.get('name') === 'item'
  ) {
    const itemAnchor = model.data.anchors[4];
    if (itemAnchor && itemAnchor.data.schema && itemAnchor.data.type === DataType.Object) {
      addCreateObject({
        label: 'item',
        name: 'item',
        value: itemAnchor.data.value,
        schema: itemAnchor.data.schema,
      });
    }
  }
  // 构造对象参数 展开逻辑
  if (
    vm.stageMode !== StageMode.METHOD_LIST &&
    model.type === BlockNames_DTS.LOGIC_CREATE_OBJECT_NODE &&
    shape.get('name') === 'param'
  ) {
    const _object_config = shape.attr()._object_config;
    if (_.isObject(_object_config)) {
      const _object_config = shape.attr()._object_config;
      if (_object_config.type !== DataType.Object) {
        return;
      }
      addCreateObject({
        label: _object_config.label,
        name: _object_config.name,
        value: _object_config.value,
        schema: _object_config.schema,
      });
    }
  }

  // TODO 后面把这个方法拆出来,业务逻辑有点多
  if (vm.stageMode === StageMode.METHOD_LIST && model.type === BlockNames_DTS.LOGIC_FUNC_NODE) {
    vm.curSelectedNodeConfig = null;
    if (e && e.item) {
      const model = e.item.get<INodeConfig<IFuncNodeConfig>>('model');
      vm.curSelectedNodeConfig = model; // 元数据
      vm.$emit('select-node', model);
      const method = _.find<Method>(
        vm.methodList,
        (m: Method) => m.id === (vm.curSelectedNodeConfig as INodeConfig<IFuncNodeConfig>).data.funcId,
      );
      vm.curEditMethod = _.cloneDeep(method);
      methodMixin.changeCurMethodId(method.id); // 全局记录一下当前编辑的方法ID
      methodMixin.changeCurMethod(vm.curEditMethod); // 这个方法内部会读取当前编辑的方法id,所以要先设置方法id
      vm.$emit('change-graph', StageMode.METHOD_DETAIL);
      vm.$emit('select-node', null);
    }
  }
}

export function handleKeydown(vm: LogicEditorStage, e: IG6GraphEvent) {
  const keyboardEvent = e.originalEvent as KeyboardEvent | undefined;
  const code = keyboardEvent?.code || e.code;
  const target = keyboardEvent?.target;
  const isEditableTarget =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable);

  // 删除仅响应独立的 Backspace/Delete，避免修饰键和编辑控件中的输入误删画布节点。
  if (
    !vm.curSelectedNode ||
    isEditableTarget ||
    keyboardEvent?.altKey ||
    keyboardEvent?.ctrlKey ||
    keyboardEvent?.metaKey ||
    keyboardEvent?.shiftKey ||
    (code !== 'Backspace' && code !== 'Delete')
  ) {
    return;
  }

  vm.deleteNode(vm.curSelectedNode as INode);
}

/**
 * 删除边或者节点
 * @param item 边 / 节点
 */
export function onBeforeItemDelete(item: Item) {
  const type = item.getType();

  const updateAnchorStatus = (node: INode, anchorIndex: number) => {
    const edges = node.getEdges().filter((e) => e.getModel().sourceAnchor === anchorIndex);
    if (edges.length <= 1) {
      const cfg = node.getModel() as INodeConfig;
      cfg.data.anchors[anchorIndex].connected = false;
      node.update(cfg);
    }
    return edges;
  };

  const graph = GraphUtil.getInstance().graph;
  const updateAnchorStatusByEdge = (edge: IEdge) => {
    const { source, sourceAnchor, target, targetAnchor } = edge.getModel() as EdgeConfig;
    const sourceNode = graph.findById(source) as INode;
    const targetNode = graph.findById(target) as INode;

    if (sourceNode) {
      updateAnchorStatus(sourceNode, sourceAnchor as number);
    }
    if (targetNode) {
      updateAnchorStatus(targetNode, targetAnchor as number);
    }
  };

  if (type === 'edge') {
    updateAnchorStatusByEdge(item as IEdge);
  } else if (type === 'node') {
    const edges = (item as INode).getEdges();
    edges.forEach((edge) => {
      updateAnchorStatusByEdge(edge);
    });
  }
}

export function beforeAnchorShow(vm: LogicEditorStage, e: IG6GraphEvent) {
  e.item.setState('anchorShow', vm.stageMode !== StageMode.VARIABLE_LIST);
}
