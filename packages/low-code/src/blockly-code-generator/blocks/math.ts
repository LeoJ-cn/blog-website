import * as Blockly from 'blockly'

import { JavaScript } from '../blockly-javascript'

let registered = false

type Operator = readonly [string, number]

function value(block: Blockly.Block, name: string, order: number, fallback = '0'): string {
  return JavaScript.valueToCode(block, name, order) || fallback
}

/** 注册当前 Logic Editor 会产生的算术、比较及取反块。 */
export function registerMathBlocklyBlocks(): void {
  if (registered) return

  Blockly.defineBlocksWithJsonArray([
    {
      type: 'math_compare',
      message0: '%1 %2 %3',
      args0: [
        { type: 'input_value', name: 'A' },
        {
          type: 'field_dropdown',
          name: 'OP',
          options: [['=', 'EQUAL'], ['≠', 'NOT_EQUAL'], ['>', 'MORE'], ['≥', 'MOREOREQUAL'], ['<', 'LESS'], ['≤', 'LESSOREQUAL']],
        },
        { type: 'input_value', name: 'B' },
      ],
      inputsInline: true,
      output: 'Boolean',
    },
    {
      type: 'logic_compare',
      message0: '%1 %2 %3',
      args0: [
        { type: 'input_value', name: 'A' },
        { type: 'field_dropdown', name: 'OP', options: [['&&', 'ANDAND'], ['||', 'OROR']] },
        { type: 'input_value', name: 'B' },
      ],
      inputsInline: true,
      output: 'Boolean',
    },
    {
      type: 'math_arithmetic_basic',
      message0: '%1 %2 %3',
      args0: [
        { type: 'input_value', name: 'A' },
        { type: 'field_dropdown', name: 'OP', options: [['+', 'ADD'], ['-', 'MINUS'], ['*', 'MULTIPLY'], ['/', 'DIVIDE'], ['%', 'MODULUS']] },
        { type: 'input_value', name: 'B' },
      ],
      inputsInline: true,
      output: null,
    },
    {
      type: 'block_not',
      message0: '! %1',
      args0: [{ type: 'input_value', name: 'value' }],
      output: 'Boolean',
    },
  ])

  JavaScript.math_compare = (block: Blockly.Block) => {
    const operators: Record<string, Operator> = {
      EQUAL: [' == ', JavaScript.ORDER_EQUALITY],
      NOT_EQUAL: [' != ', JavaScript.ORDER_EQUALITY],
      MORE: [' > ', JavaScript.ORDER_RELATIONAL],
      MOREOREQUAL: [' >= ', JavaScript.ORDER_RELATIONAL],
      LESS: [' < ', JavaScript.ORDER_RELATIONAL],
      LESSOREQUAL: [' <= ', JavaScript.ORDER_RELATIONAL],
    }
    const [operator, order] = operators[block.getFieldValue('OP')]
    return [`${value(block, 'A', order)}${operator}${value(block, 'B', order)}`, order]
  }

  JavaScript.logic_compare = (block: Blockly.Block) => {
    const operators: Record<string, Operator> = {
      ANDAND: [' && ', JavaScript.ORDER_LOGICAL_AND],
      OROR: [' || ', JavaScript.ORDER_LOGICAL_OR],
    }
    const [operator, order] = operators[block.getFieldValue('OP')]
    return [`${value(block, 'A', order)}${operator}${value(block, 'B', order)}`, order]
  }

  JavaScript.math_arithmetic_basic = (block: Blockly.Block) => {
    const operators: Record<string, Operator> = {
      ADD: [' + ', JavaScript.ORDER_ADDITION],
      MINUS: [' - ', JavaScript.ORDER_SUBTRACTION],
      MULTIPLY: [' * ', JavaScript.ORDER_MULTIPLICATION],
      DIVIDE: [' / ', JavaScript.ORDER_DIVISION],
      MODULUS: [' % ', JavaScript.ORDER_MODULUS],
    }
    const [operator, order] = operators[block.getFieldValue('OP')]
    return [`(${value(block, 'A', order)})${operator}(${value(block, 'B', order)})`, order]
  }

  JavaScript.block_not = (block: Blockly.Block) => [
    `!${value(block, 'value', JavaScript.ORDER_ATOMIC, 'false')}`,
    JavaScript.ORDER_LOGICAL_NOT,
  ]

  registered = true
}
