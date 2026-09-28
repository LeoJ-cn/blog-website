import {
  DescInfo_DTS,
  SideQuests_DTS,
  BlockNames_DTS,
  AnchorTag_DTS,
  LogicBlockBaseTplMap_DTS,
  ConstOrVariable_DTS,
} from './interface';
import { DataType } from '../../types/schema';

// 中转节点
export const SCOPE_HUB_NODE = '__scope-hub-node__';

/**
 * 方法块：Fixed定义
 */
export const LogicBlockBaseTplMap: LogicBlockBaseTplMap_DTS = {
  [BlockNames_DTS.LOGIC_TRY_CATCH_NODE]: {
    label: '异常捕获',
    anchors: {
      '0': {
        nodeId: '',
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        connected: false,
        data: {
          _isEntry: true,
          label: '开始',
        },
      },
      '1': {
        nodeId: '',
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        nodeId: '',
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 2,
        connected: false,
        data: {
          label: '尝试执行',
          _sideQuests: SideQuests_DTS.TRY_SYNTAX,
        },
      },
      '3': {
        nodeId: '',
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 3,
        connected: false,
        data: {
          label: '错误捕获',
          _sideQuests: SideQuests_DTS.CATCH_SYNTAX,
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_START_NODE]: {
    label: '开始',
    anchors: {
      '0': {
        nodeId: '',
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 0,
        connected: false,
        data: {
          _isExit: true,
          label: '开始',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_END_NODE]: {
    label: '结束',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '结束',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_LIFECYCLE_NODE]: {
    label: '生命周期',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          label: '页面加载完成时',
          type: DataType.Function,
          tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          label: '页面加载完成时',
          type: DataType.Function,
          tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        },
      },
      '2': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          label: '页面销毁时',
          type: DataType.Function,
          tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_FUNC_NODE]: {
    label: '自定义方法',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      // 返回值属于“非固定的参数类”， 取消在这里的配置
      // "2": {
      //   tag: AnchorTag_DTS.VAR_OUTPUT,
      //   index: 2,
      //   nodeId: "",
      //   data: {
      //     type: DataType.Undefined,
      //     label: '返回值'
      //   }
      // }
    },
  },
  [BlockNames_DTS.LOGIC_API_NODE]: {
    label: '调用API',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        data: {
          _isExit: true,
          label: '输出',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_NET_NODE]: {
    label: '网络请求',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.String,
          label: '请求地址',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.NETWORK_REQUEST_URL,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Object,
          label: '返回数据',
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Object,
          label: '请求参数',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.NETWORK_REQUEST_PARAMS,
        },
      },
      '5': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 5,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Object,
          label: '请求头',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.NETWORK_REQUEST_HEADER,
        },
      },
      '6': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 6,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Object,
          label: '请求栈',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.NETWORK_REQUEST_STACK,
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_MESSAGE_NODE]: {
    label: '消息提醒',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        selected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        selected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        selected: false,
        data: {
          tag: AnchorTag_DTS.VAR_INPUT,
          type: DataType.String,
          label: '提醒内容',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_IFELSE_NODE]: {
    label: '如果否则',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_ROUTER_NODE]: {
    label: '路由跳转',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          tag: AnchorTag_DTS.VAR_INPUT,
          type: DataType.Object,
          label: 'params参数',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.ROUTER_PARAMS,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          tag: AnchorTag_DTS.VAR_INPUT,
          type: DataType.Object,
          label: 'query参数',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.ROUTER_QUERY,
        },
      },
    },
  },

  [BlockNames_DTS.LOGIC_ARRAY_FOREACH_NODE]: {
    label: '数组循环',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Array,
          label: '数组',
          _desc: DescInfo_DTS.ARRAY_FOREACH_SOURCE,
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Function,
          label: '循环体',
          _sideQuests: SideQuests_DTS.FOREACH_BODY_SYNTAX,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Number,
          label: '索引',
          _desc: DescInfo_DTS.ARRAY_FOREACH_INDEX,
        },
      },
      '5': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 5,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '项',
          _desc: DescInfo_DTS.ARRAY_FOREACH_ITEM,
        },
      },
    },
  },

  [BlockNames_DTS.LOGIC_SET_ARRAY_ITEM_NODE]: {
    label: '设置数组项',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Array,
          label: '目标数组',
          _desc: DescInfo_DTS.ARRAY_FOREACH_SOURCE,
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Number,
          label: '索引',
          _desc: DescInfo_DTS.ARRAY_FOREACH_INDEX,
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '数组项',
          _desc: DescInfo_DTS.ARRAY_FOREACH_ITEM,
        },
      },
    },
  },

  [BlockNames_DTS.LOGIC_CALC_NODE]: {
    label: '计算',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '前值',
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '计算结果',
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '后值',
        },
      },
    },
  },

  [BlockNames_DTS.LOGIC_ASSIGN_NODE]: {
    label: '赋值',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '变量',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '值',
          _desc: DescInfo_DTS.VALUE,
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_VARIABLE_DETIAL_NODE]: {
    label: '变量详情',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          tag: AnchorTag_DTS.VAR_INPUT,
          type: DataType.Object,
          label: '',
          value: '',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_CREATE_OBJECT_NODE]: {
    label: '参数详情',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          tag: AnchorTag_DTS.VAR_OUTPUT,
          type: DataType.Object,
          label: '',
          value: '',
        },
      },
    },
  },

  [BlockNames_DTS.LOGIC_EQUAL_NODE]: {
    label: '等于',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '前值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '后值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Boolean,
          label: '返回值',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_NOT_EQUAL_NODE]: {
    label: '不等于',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '前值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '后值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Boolean,
          label: '返回值',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_LESS_NODE]: {
    label: '小于',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '前值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '后值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Boolean,
          label: '返回值',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_GREATER_NODE]: {
    label: '大于',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '前值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '后值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Boolean,
          label: '返回值',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_LESS_EQUAL_NODE]: {
    label: '小于等于',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '前值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '后值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Boolean,
          label: '返回值',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_GREATER_EQUAL_NODE]: {
    label: '大于等于',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '前值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '后值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Boolean,
          label: '返回值',
        },
      },
    },
  },

  [BlockNames_DTS.LOGIC_NEGATION_NODE]: {
    label: '取反',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Boolean,
          label: '入值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Boolean,
          label: '返回值',
        },
      },
    },
  },

  [BlockNames_DTS.LOGIC_AND_NODE]: {
    label: '与',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '前值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '后值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Boolean,
          label: '返回值',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_OR_NODE]: {
    label: '或',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '前值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '后值',
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Boolean,
          label: '返回值',
        },
      },
    },
  },
  // 加法
  [BlockNames_DTS.LOGIC_ADDITION_NODE]: {
    label: '加法',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '前值',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '后值',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '返回值',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_SUBTRACTION_NODE]: {
    label: '减法',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '前值',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '后值',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Number,
          label: '返回值',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_MULTIPLICATION_NODE]: {
    label: '乘法',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '前值',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '后值',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Number,
          label: '返回值',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_DIVISION_NODE]: {
    label: '除法',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '前值',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '后值',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Number,
          label: '返回值',
        },
      },
    },
  },
  [BlockNames_DTS.LOGIC_REMAINDER_NODE]: {
    label: '取余',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '前值',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Undefined,
          label: '后值',
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
          _desc: DescInfo_DTS.VARIABLE,
        },
      },
      '4': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 4,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Number,
          label: '返回值',
        },
      },
    },
  },

  // 侧边提醒
  [BlockNames_DTS.LOGIC_SIDE_MESSAGE_NODE]: {
    label: '侧边提醒',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_INPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.String,
          label: '提醒文字',
          _desc: DescInfo_DTS.VARIABLE,
          constOrVariable: ConstOrVariable_DTS.USE_VARIABLE,
        },
      },
    },
  },
  // 页面传值
  [BlockNames_DTS.LOGIC_PAGE_PASS_VALUE_NODE]: {
    label: '页面传值',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Object,
          label: '返回值',
        },
      },
    },
  },
  // 获取多语言
  [BlockNames_DTS.LOGIC_GET_LOCALE_NODE]: {
    label: '获取多语言',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.String,
          label: '多语言类型',
          _desc: DescInfo_DTS.CURRENT_LANGUAGE,
        },
      },
      '3': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 3,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.String,
          label: '返回值',
          _desc: DescInfo_DTS.RETURN_VALUE,
        },
      },
    },
  },
  // 设置多语言
  [BlockNames_DTS.LOGIC_SET_LOCALE_NODE]: {
    label: '设置多语言',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
    },
  },
  // 获取方法引用
  [BlockNames_DTS.LOGIC_METHOD_REF_NODE]: {
    label: '获取方法引用',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.String,
          label: '返回值',
        },
      },
    },
  },
  // 下次渲染结果执行
  [BlockNames_DTS.LOGIC_NEXT_TICK_NODE]: {
    label: '下次渲染结果执行',
    anchors: {
      '0': {
        tag: AnchorTag_DTS.STATEMENT_INPUT,
        index: 0,
        nodeId: '',
        connected: false,
        data: {
          _isEntry: true,
          label: '输入',
        },
      },
      '1': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 1,
        nodeId: '',
        connected: false,
        data: {
          _isExit: true,
          label: '输出',
        },
      },
      '2': {
        tag: AnchorTag_DTS.STATEMENT_OUTPUT,
        index: 2,
        nodeId: '',
        connected: false,
        data: {
          type: DataType.Function,
          label: '子方法体',
          _sideQuests: SideQuests_DTS.NEXT_TICK,
        },
      },
    },
  },
};

/**
 * 非固定类的锚点【比如“自定义函数”的入参出参不固定】
 * PS：固定类的锚点有固定的结构， 比如“全局提醒”
 */
export const ParamAnchor = [AnchorTag_DTS.VAR_INPUT, AnchorTag_DTS.VAR_OUTPUT];
