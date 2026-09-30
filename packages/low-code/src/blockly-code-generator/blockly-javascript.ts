import * as Blockly from 'blockly'

export type LegacyJavaScriptGenerator = Blockly.Generator & {
  [blockType: string]: unknown
  ORDER_ADDITION: number
  ORDER_ATOMIC: number
  ORDER_DIVISION: number
  ORDER_EQUALITY: number
  ORDER_LOGICAL_AND: number
  ORDER_LOGICAL_NOT: number
  ORDER_LOGICAL_OR: number
  ORDER_MEMBER: number
  ORDER_MODULUS: number
  ORDER_MULTIPLICATION: number
  ORDER_NONE: number
  ORDER_RELATIONAL: number
  ORDER_SUBTRACTION: number
}

/** Blockly 4 的主声明遗漏了运行时 JavaScript Generator，统一在边界处完成类型适配。 */
export const JavaScript = (
  Blockly as typeof Blockly & { JavaScript: LegacyJavaScriptGenerator }
).JavaScript
