import { NodeRenderConfig } from "../../../interface";

export const addArrayNode: NodeRenderConfig = {
  type: 'logic-add-array-item-node',
  nodeWidth: 210,
  nodeHeight: 134,
  label: '添加数组项',
  name: 'Add Array Item',
  img: '../../img/message.svg',
  operations: ['help'],
  data: {
    anchors: [
      {
        tag: 'statement_input',
        index: 0,
        data: {
          label: '输入',
          name: 'Input',
        },
      },
      {
        tag: 'statement_output',
        index: 1,
        data: {
          label: '输出',
        },
      },
      {
        tag: 'var_input',
        index: 2,
        data: {
          type: 'array',
          label: '目标数组',
          name: 'Target',
        },
      },
      {
        tag: 'var_input',
        index: 3,
        data: {
          type: 'undefined',
          label: '添加项',
          name: 'Item',
        },
      },
      {
        tag: 'var_input',
        index: 4,
        data: {
          type: 'number',
          label: '索引',
          name: 'Index',
        },
      },
    ],
  },
};



