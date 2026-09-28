import G6, { GraphData, GraphOptions, IG6GraphEvent, IGraph } from '@antv/g6';
import _ from 'lodash';
import { LogicNodeRecord } from '../../types/records';
import { INodeConfigService } from '../handler/config-builder/interface';
import { NodeConfigServicesFactory } from '../handler/config-builder/node-config-services-factory';
import { BlockNames_DTS } from '../service/interface';
import { INodeConfig, StageMode } from './../interface/index';
import registerFactory from './register-factory';
import defaultStyles from './shape/defaultStyles';
import { registerNode } from './util/node-update';

const { nodeStateStyles } = defaultStyles;

export interface GraphEventMap {
  eventName: string;
  callback: (e: IG6GraphEvent | any) => void | Promise<void>;
}

export interface IStoreGraphDataList {
  [StageMode.METHOD_LIST]: GraphData;
  [StageMode.METHOD_DETAIL]: {
    [method_id: string]: GraphData;
  };
  [StageMode.VARIABLE_LIST]: GraphData;
}

export type G6EventCallback<T = IG6GraphEvent> = T;

export class GraphUtil {
  private static instance: GraphUtil;
  private _graph: IGraph;

  // 当前舞台的类型
  private _curMode: StageMode = null;
  // 当前舞台缓存的图数据
  private _storeGraphDataList: IStoreGraphDataList = {
    [StageMode.METHOD_LIST]: null,
    [StageMode.METHOD_DETAIL]: null,
    [StageMode.VARIABLE_LIST]: null,
  };

  // 节点渲染配置
  private nodeRecords: LogicNodeRecord[] = [];

  private constructor() {
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new GraphUtil();
    }
    window.GraphUtil = this;
    return this.instance;
  }

  public get graph() {
    return this._graph;
  }


  /**
   * 生成grap实例对象
   * @param options 初始化graph实例的初始化参数
   */
  public initGraph(options: GraphOptions) {
    const { container } = options;
    if (!container) {
      throw Error('缺少 container 字段！');
    }
    const logicEditorContainer = document.getElementById('logicEditorContainer') as HTMLElement;
    const width = logicEditorContainer.scrollWidth;
    const height = logicEditorContainer.scrollHeight;

    registerFactory(G6);

    // this.registerCustomNode();

    const mergedOptions = _.merge(
      {},
      {
        width,
        height,
        enabledStack: true,
        container: 'logicEditorContainer',
        modes: {
          default: [
            'drag-canvas',
            'drag-shadow-node',
            'canvas-event',
            'delete-item',
            'select-node',
            'hover-node',
            'active-edge',
            {
              type: 'scroll-container',
              zoomKey: ['control', 'meta'],
              // g6 源码有bug，不支持数组
              // zoomKey: /windows|win32/i.test(navigator.userAgent) ? 'ctrl' : 'meta',
            },
            {
              type: 'shortcuts-call',
              trigger: 'ctrl',
              combinedKey: '1',
              functionName: 'fitView',
            },
            {
              type: 'shortcuts-call',
              trigger: 'ctrl',
              combinedKey: '2',
              functionName: 'updateLayout',
              functionParams: [
                {
                  type: 'dagre',
                  rankdir: 'LR',
                  align: 'UL',
                  controlPoints: true,
                  ranksepFunc: () => 150,
                  nodesepFunc: () => (this._curMode !== StageMode.VARIABLE_LIST ? 50 : 25),
                },
              ],
            },
            {
              type: 'shortcuts-call',
              trigger: 'alt',
              combinedKey: '3',
              functionName: 'moveTo',
              functionParams: [100, 100],
            },
          ],
          originDrag: [
            'drag-canvas',
            'drag-node',
            'canvas-event',
            'delete-item',
            'select-node',
            'hover-node',
            'active-edge',
          ],
        },
        nodeStateStyles,
        layout: {},
      },
      options,
    );

    return (this._graph = new G6.Graph(mergedOptions));
  }

  /**
   * 添加节点渲染配置
   */
  public addNode(record: LogicNodeRecord[]) {
    this.nodeRecords.push(...record);
  }

  /**
   * 设置最小缩放比例
   * @param scaling 缩放比例
   */
  public setMinZoom(scaling: number) {
    this._graph.setMinZoom(scaling);
  }

  /**
   * 设置最大缩放比列
   * @param scaling 缩放比例
   */
  public setMaxZoom(scaling: number) {
    this._graph.setMaxZoom(scaling);
  }

  /**
   * 注册回调事件
   */
  public registerEvents(event: GraphEventMap[]);
  public registerEvents(event: string, callback: (e: IG6GraphEvent) => void);
  public registerEvents(event: string | GraphEventMap[], callback?: (e: IG6GraphEvent) => void) {
    if (_.isString(event)) {
      this._graph.on(event as string, callback);
    } else {
      _.forEach(event, (ev: GraphEventMap) => {
        this._graph.on(ev.eventName, ev.callback);
      });
    }
  }

  public unRegisterEvents(event: GraphEventMap[]);
  public unRegisterEvents(event: string, callback: (e: IG6GraphEvent) => void);
  public unRegisterEvents(event: string | GraphEventMap[], callback?: (e: G6EventCallback) => void) {
    if (_.isString(event)) {
      this._graph.off(event as string, callback);
    } else {
      _.forEach(event, (ev: GraphEventMap) => {
        this._graph.off(ev.eventName, ev.callback);
      });
    }
  }

  /**
   * 销毁G6Graph实例
   */
  public destoryGraph() {
    this._graph.clear();
    this._graph.destroy();
    this._graph = null;
  }

  public storeGraphData(data: IStoreGraphDataList) {
    this._storeGraphDataList = data;
  }

  public getStoredGraphData(mode?: StageMode) {
    return mode ? this._storeGraphDataList[mode] : this._storeGraphDataList;
  }

  public storeCurMode(mode: StageMode) {
    this._curMode = mode;
  }

  public getStoredStageMode(): StageMode {
    return this._curMode;
  }


  /**
   * 注册节点
   */
  private registerCustomNode() {
    try {
      const maps: Array<[string, INodeConfigService]> = _
        .toPairs(NodeConfigServicesFactory.getNodeConfig())
        .filter(
          (i) => ![
            BlockNames_DTS.LOGIC_STRING_NODE,
            BlockNames_DTS.LOGIC_BOOLEAN_NODE,
            BlockNames_DTS.LOGIC_NUMBER_NODE,
            BlockNames_DTS.LOGIC_ARRAY_NODE,
            BlockNames_DTS.LOGIC_OBJECT_NODE,
            BlockNames_DTS.LOGIC_VARIABLE_DETIAL_NODE,
            BlockNames_DTS.LOGIC_START_NODE,
            BlockNames_DTS.LOGIC_END_NODE,
            BlockNames_DTS.LOGIC_API_NODE,
            BlockNames_DTS.LOGIC_FUNC_NODE,
          ].includes(i[0] as BlockNames_DTS));

      const configs = _.map(maps, (item) => {
        const service = item[1];
        if (service.getConfig) {
          const config = service.getConfig({ x: 0, y: 0 });
          return config;
        }
      }).filter((v) => v);

      _.forEach(configs, (config: INodeConfig) => {
        registerNode(config);
      });

    } catch (error) {

    }

  }
}
