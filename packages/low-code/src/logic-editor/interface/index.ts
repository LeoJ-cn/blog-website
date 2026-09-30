/* 历史协议使用 `{}` 表示非 nullish 的兜底值，不能收窄为 object 或 unknown。 */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { IShape, ShapeAttrs } from '@antv/g-base';
import G6, { type IGroup, type Item, type ModelConfig, type NodeConfig, type UpdateType } from '@antv/g6';
import type { MethodRecord } from '../../types/records';
import { AnchorBaseConfig_DTS, BlockNames_DTS } from '../service/interface';

export { assertNodeConfig, isNodeConfig } from './node-config-guard';

export type IG6 = typeof G6;

export type AnchorItem = [number, number, AnchorItemCfg];

export type IIGroup = IGroup & {
  /** 按类名查找节点内部图形；拖拽辅助图形尚未创建或已被清理时返回 undefined。 */
  $getItem: (className: string) => IShape | undefined;
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

export type IShapeOptions<T extends NodeConfigDataUnion = {}> = Partial<{
  itemType: string;
  shapeType: string;
  draw: (cfg: IModelConfig<T>, group: IIGroup) => IShape;
  drawShape: (cfg: IModelConfig<T>, group: IIGroup) => IShape;
  afterDraw: (cfg?: ModelConfig, group?: IIGroup, rst?: IShape) => void;
  afterUpdate: (cfg?: ModelConfig, item?: Item) => void;
  setState: (name?: string, value?: string | boolean, item?: Item) => void;
  getAnchorPoints: (cfg: IModelConfig<T>) => AnchorBaseConfigWithPosition[] | undefined;
  update: (cfg: ModelConfig, item: Item, updateType?: UpdateType) => void;

  calcNodeHeight: (cfg: INodeConfig<T>) => void;
  assembleShape: (cfg: IModelConfig<T>, group: IIGroup) => void;
  getShapeStyle: (cfg: IModelConfig<T>) => ShapeAttrs;
  initAnchor: (cfg: IModelConfig<T>, group: IIGroup) => void;
  drawAnchor: (cfg: IModelConfig<T>, group: IIGroup) => void;
  getNodeAnchorBg: (options: {
    cfg: IModelConfig<T>;
    group: IIGroup;
    x: number;
    y: number;
    anchorIdx: number;
    position: AnchorBaseConfigWithPosition;
  }) => IShape;
  stateApplying: (name?: string, value?: string | boolean, item?: Item) => void;
}>;

/** G6 渲染阶段的完整节点模型；进入 shape 回调前必须已经完成节点协议校验。 */
export interface IModelConfig<T extends NodeConfigDataUnion = {}> extends INodeConfig<T> {
  nodeWidth: number;
  nodeHeight: number;
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
  img?: string; // 动态方法/变量节点可沿用节点类型图标，因此不强制提供独立图标。
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
  | IApiConfig
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
  api: MethodRecord;
}

export type INodeConfig<T extends NodeConfigDataUnion = {}> = NodeConfig & {
  /** 持久化节点类型或 G6 注册名，不能为空字符串。 */
  type: BlockNames_DTS | string;
  /** 节点业务数据；外部输入通过守卫后，内部调用方可依赖该字段存在。 */
  data: NodeConfigData<T>;
  nodeWidth?: number;
  nodeHeight?: number;
  label?: string;
  name?: string;
  img?: string;
  /** 节点标题栏操作标识，例如 `help` 或 `detail`。 */
  operations?: string[];
};

export type NodeConfigData<T extends NodeConfigDataUnion = {}> = T & {
    /**
     * 节点完整锚点表；数组顺序与 `anchor.index` 协议一致，连接边通过该索引定位锚点。
     */
    anchors: AnchorBaseConfig_DTS[];
    /** 展开变量详情节点时记录来源节点 ID；普通节点不设置。 */
    _origin_node_id?: string;
    /** 展开变量详情节点时记录来源锚点索引；从 0 开始，普通节点不设置。 */
    _origin_anchor_index?: number;
};

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
