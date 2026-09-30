import type * as Blockly from 'blockly'

import type { DataRegistry } from './DataRegistry'
import type { MethodRegistry } from './MethodRegistry'

export type CodeGenerationWorkspace = Blockly.Workspace & {
  dataRegistry?: DataRegistry
  methodRegistry?: MethodRegistry
}
