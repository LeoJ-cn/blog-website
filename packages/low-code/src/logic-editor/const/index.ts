/* 旧编辑器依赖打包器的 SVG require 返回值；Task 5 迁移资源前必须保留该配置语义。 */
/* eslint-disable @typescript-eslint/no-require-imports */
import { LogicCategory } from '../interface';
import { DataType } from '../../types/schema';
import { BlockNames_DTS } from '../service/interface';

// 支持创建的变量类型
export const VARIABLE_TYPES = [
  DataType.Boolean,
  DataType.Number,
  DataType.String,
  DataType.Array,
  DataType.Object,
];

export const variableCategory: LogicCategory = {
  name: 'var',
  label: '变量',
  children: (() => {
    return [{
      name: 'string',
      label: '文本',
    },
    {
      name: 'number',
      label: '数字',
    },
    {
      name: 'boolean',
      label: '布尔',
    },
    {
      name: 'array',
      label: '数组',
    },
    {
      name: 'object',
      label: '对象',
    },
    ].map((item: { label: string; name: string }) => {
      return {
        type: `logic-${item.name}-node` as BlockNames_DTS,
        label: item.label,
        img: require('../graph/img/variable.svg'),
      };
    });
  })(),
};

export const baseCategory: LogicCategory = {
  name: 'base',
  label: '基础',
  children: [
    {
      type: BlockNames_DTS.LOGIC_START_NODE,
      label: '开始',
      img: require('../graph/img/start.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_END_NODE,
      label: '结束',
      img: require('../graph/img/end.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_LIFECYCLE_NODE,
      label: '生命周期',
      img: require('../graph/img/lifecycle.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_FUNC_NODE,
      label: '自定义方法',
      img: require('../graph/img/func.svg'),
    },

  ],
};

export const exceptionCategory: LogicCategory = {
  name: 'exception',
  label: '异常处理',
  children: [
    {
      type: BlockNames_DTS.LOGIC_TRY_CATCH_NODE,
      label: '捕获异常',
      img: require('../graph/img/warning.svg'),
    },
  ],
};

export const operationCategory: LogicCategory = {
  name: 'operation',
  label: '操作',
  children: [
    {
      type: BlockNames_DTS.LOGIC_NET_NODE,
      label: '网络请求',
      img: require('../graph/img/net.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_MESSAGE_NODE,
      label: '消息提醒',
      img: require('../graph/img/message.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_SIDE_MESSAGE_NODE,
      label: '侧边提醒',
      img: require('../graph/img/message.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_ASSIGN_NODE,
      label: '赋值',
      img: require('../graph/img/variable.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_PAGE_PASS_VALUE_NODE,
      label: '页面传值',
      img: require('../graph/img/variable.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_GET_LOCALE_NODE,
      label: '获取多语言',
      img: require('../graph/img/variable.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_SET_LOCALE_NODE,
      label: '设置多语言',
      img: require('../graph/img/variable.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_METHOD_REF_NODE,
      label: '获取方法引用',
      img: require('../graph/img/variable.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_NEXT_TICK_NODE,
      label: '下次渲染结束执行',
      img: require('../graph/img/variable.svg'),
    },

  ],
};

export const logicCategory: LogicCategory = {
  name: 'logic',
  label: '逻辑',
  children: [
    {
      type: BlockNames_DTS.LOGIC_IFELSE_NODE,
      label: '如果否则',
      img: require('../graph/img/if-else.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_EQUAL_NODE,
      label: '等于',
      img: require('../graph/img/judge-condition.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_NOT_EQUAL_NODE,
      label: '不等于',
      img: require('../graph/img/judge-condition.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_GREATER_NODE,
      label: '大于',
      img: require('../graph/img/judge-condition.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_LESS_NODE,
      label: '小于',
      img: require('../graph/img/judge-condition.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_GREATER_EQUAL_NODE,
      label: '大于等于',
      img: require('../graph/img/judge-condition.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_LESS_EQUAL_NODE,
      label: '小于等于',
      img: require('../graph/img/judge-condition.svg'),
    },


    {
      type: BlockNames_DTS.LOGIC_NEGATION_NODE,
      label: '取反',
      img: require('../graph/img/judge-condition.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_AND_NODE,
      label: '与',
      img: require('../graph/img/judge-condition.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_OR_NODE,
      label: '或',
      img: require('../graph/img/judge-condition.svg'),
    },
  ],
};

export const routerCategory: LogicCategory = {
  name: 'router',
  label: '路由',
  children: [
    {
      type: BlockNames_DTS.LOGIC_ROUTER_NODE,
      label: '路由跳转',
      img: require('../graph/img/router.svg'),
    },
  ],
};

export const loopCategory: LogicCategory = {
  name: 'loop',
  label: '循环',
  children: [
    {
      type: BlockNames_DTS.LOGIC_ARRAY_FOREACH_NODE,
      label: '数组循环',
      img: require('../graph/img/loop.svg'),
    },
  ],
};

export const numberCategory: LogicCategory = {
  name: 'number',
  label: '数字',
  children: [
    {
      type: BlockNames_DTS.LOGIC_ADDITION_NODE,
      label: '加法',
      img: require('../graph/img/calc.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_SUBTRACTION_NODE,
      label: '减法',
      img: require('../graph/img/calc.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_MULTIPLICATION_NODE,
      label: '乘法',
      img: require('../graph/img/calc.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_DIVISION_NODE,
      label: '除法',
      img: require('../graph/img/calc.svg'),
    },
    {
      type: BlockNames_DTS.LOGIC_REMAINDER_NODE,
      label: '取余',
      img: require('../graph/img/calc.svg'),
    },
  ],
};
