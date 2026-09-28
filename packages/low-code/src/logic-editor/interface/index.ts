/* 历史协议使用 `{}` 表示非 nullish 的兜底值，不能收窄为 object 或 unknown。 */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import { IShape } from '@antv/g-base/src/interfaces';
import { ShapeAttrs } from '@antv/g-canvas';
import G6, { IGroup, Item, ModelConfig, UpdateType } from '@antv/g6';
import { NodeConfig } from '@antv/g6-core/lib/types';
import { CallApiProcessNodeFrontAttrApi } from '../../types/api';
import { AnchorBaseConfig_DTS, BlockNames_DTS } from '../service/interface';

export type IG6 = typeof G6;

export type AnchorItem = [number, number, AnchorItemCfg];

export type IIGroup = IGroup & {
  $getItem: (className: string) => IShape;
  getAllAnchors: (className: string) => IShape[];
  getAnchor: (index: number) => IShape[];
  getAllAnchorBg: () => IShape[];
  anchorShapes: IShape[];
  clearAnchor: (group?: IIGroup) => void;
  // 动画相关
  running?: boolean;
  run: (group?: IIGroup) => void;
  stop: (group?: IIGroup) => void;
  [key: string]: any;
};

export type IShapeOptions = Partial<{
  itemType: string;
  shapeType: string;
  draw: (cfg?: ModelConfig, group?: IIGroup) => IShape;
  drawShape: (cfg: ModelConfig, group: IIGroup) => IShape;
  afterDraw: (cfg?: ModelConfig, group?: IIGroup, rst?: IShape) => void;
  afterUpdate: (cfg?: ModelConfig, item?: Item) => void;
  setState: (name?: string, value?: string | boolean, item?: Item) => void;
  getAnchorPoints: (cfg?: ModelConfig) => AnchorBaseConfigWithPosition[] | undefined;
  update: (cfg: ModelConfig, item: Item, updateType?: UpdateType) => void;

  calcNodeHeight: (cfg?: INodeConfig) => void;
  assembleShape: (cfg?: INodeConfig, group?: IIGroup) => void;
  getShapeStyle: (cfg: IModelConfig) => void;
  initAnchor: (cfg: IModelConfig, group: IIGroup) => void;
  drawAnchor: (cfg: IModelConfig, group: IIGroup) => void;
  getNodeAnchorBg: (options: {
    cfg: IModelConfig;
    group: IIGroup;
    x: number;
    y: number;
    anchorIdx: number;
    position: number[];
  }) => IShape;
}>;

export interface IModelConfig extends ModelConfig {
  nodeWidth: number;
  nodeHeight: number;
  data: INodeConfig;
}

export enum AnchorTag {
  STATEMENT_INPUT = 'statement_input',
  STATEMENT_OUTPUT = 'statement_output',
  VAR_INPUT = 'var_input',
  VAR_OUTPUT = 'var_output',
}

export enum StageMode {
  METHOD_LIST = 'methodList',
  METHOD_DETAIL = 'methodDetail',
  VARIABLE_LIST = 'variableList',
}

export interface AnchorData {
  tag: AnchorTag;
  type: string;
  label: string;
  value: any;

  [key: string]: any; // 不同的节点的不同锚点还有可能有自己的特有属性
}

export interface LogicCategory {
  label: string;
  name: string;
  uuid?: string;
  children: LogicCategoryItem[];
}

export interface LogicCategoryItem {
  type: BlockNames_DTS | string; // 节点名称
  label: string; // 节点中文名称
  name?: string; // 节点英文名称
  img: string; // 节点icon
  meta?: INodeConfig; // 节点配置
}

export interface AnchorItemCfg {
  index: number;
  nodeId: string;
  tag: AnchorTag;
  connected: boolean; // 是否被链接
  data: AnchorData;
}

export interface DefaultStyleConfig {
  nodeStyles: ShapeAttrs;
  nodeStateStyles: {
    'nodeState:default': ShapeAttrs;
    'nodeState:hover': ShapeAttrs;
    'nodeState:selected': ShapeAttrs;
  };
  edgeStyles: ShapeAttrs;
  edgeStateStyles: {
    selected: ShapeAttrs;
    hover: ShapeAttrs;
  };
  anchorPointStyles: ShapeAttrs;
}

export type NodeConfigDataUnion =
  | IVarNodeConfig
  | IFuncNodeConfig
  | IMessageNodeConfig
  | ISideMessageConfig
  | INetNodeConfig
  | IRouteNodeConfig
  | ISetLocaleConfig
  | IMethodRef
  | IPagePassValue
  | IGetLocalLan
  | {};

export interface IGetLocalLan {
  i18nKey: string;
}

export interface IMethodRef {
  methodId: string;
}

export interface ISetLocaleConfig {
  language: LanguageMap;
}

/**
 * 支持的语言
 */
export enum LanguageMap {
  CN = 'zh-CN', // 中文
  EN = 'en-US', // 英文
}

export interface IPagePassValue {
  page_pass_value_type: PagePassValueType;
}

/**
 * 路由取值
 */
export enum PagePassValueType {
  PATH = 'path', // 路径
  NAME = 'name', // 路由名
  QUERY = 'query', // 路由查询参数
  PARAMS = 'params', // 动态路由键值对
  META = 'meta', // 信息
}

export interface IRouteNodeConfig {
  target_page: string;
}

/**
 * 网络请求方式
 */
export enum RequestType {
  POST = 'post',
  GET = 'get',
  DELETE = 'delete',
  PUT = 'put',
  PATCH = 'patch',
}

export interface INetNodeConfig {
  requestType: RequestType;
}

/**
 * 消息提醒的类型
 */
export enum MessageType {
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

/**
 * 侧边提醒
 */
export interface ISideMessageConfig {
  content: string;
  type: SideMessageType;
}

/**
 * 侧边提醒类型
 */
export enum SideMessageType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROE = 'error',
}

export interface IMessageNodeConfig {
  during: number;
  type: MessageType;
  content: string;
}

export interface IVarNodeConfig {
  varId: string;
  varLabel: string;
  varName: string;
}

export interface IFuncNodeConfig {
  funcId: string;
  funcName: string;
  funcLabel: string;
}

export interface IApiConfig {
  api: CallApiProcessNodeFrontAttrApi;
}

export type INodeConfig<T extends NodeConfigDataUnion = {}> = Partial<
  {
    type: BlockNames_DTS | string; // 节点类型
    nodeWidth: number; // 节点宽度
    nodeHeight: number; // 节点高度
    label: string; // 标题中文名称
    name: string; // 标题英文名称
    img: string; // 节点icon图标
    operations: string[]; // 操作按钮 'help' | 'detail'
    data: NodeConfigData<T>;
  } & NodeConfig
>;

export type NodeConfigData<T extends NodeConfigDataUnion = {}> = T extends infer U
  ? U & {
    anchors: AnchorBaseConfig_DTS[];
    _origin_node_id?: string;
    _origin_anchor_index?: number;
  }
  : never;

export interface IPositon {
  x: number;
  y: number;
}

export interface LogicTransferData {
  type: BlockNames_DTS;
  /** 已有节点的序列化配置；缺省时表示创建对应类型的新节点。 */
  model?: string;
}

export type AnchorBaseConfigWithPosition = [number, number, AnchorBaseConfig_DTS];

/**
 * 用来节点渲染的配置
 */
export interface NodeRenderConfig {
  type: string; // 节点类型
  nodeWidth: number; // 节点宽度
  nodeHeight: number; // 节点高度
  label: string; // 标题中文名称
  name: string; // 标题英文名称
  img: string; // 节点icon图标
  operations: string[]; // 操作按钮 'help' | 'detail'
  data: {
    anchors: Array<{
      tag: string;
      index: number;
      data: {
        label?: string; // 锚点中文名称
        name?: string; // 锚点英文名称
        type?: string; // 数据类型
      };
    }>
  };
};
