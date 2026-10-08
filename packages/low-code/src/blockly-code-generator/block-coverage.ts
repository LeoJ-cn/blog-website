import * as Blockly from 'blockly'

import { JavaScript } from './blockly-javascript'
import type { CodeGenerationDiagnostic } from './types'

function collectBlockTypes(xml: Element): string[] {
  const elements = [
    ...Array.from(xml.getElementsByTagName('block')),
    ...Array.from(xml.getElementsByTagName('shadow')),
  ]

  return [...new Set(elements.map((element) => element.getAttribute('type') || '').filter(Boolean))].sort()
}

/**
 * 在创建 Workspace 前检查 XML 所需能力，避免 Blockly 只报告首个未知块或在生成阶段才暴露缺失 Generator。
 */
export function validateBlockCoverage(xml: Element): CodeGenerationDiagnostic[] {
  const blockTypes = collectBlockTypes(xml)
  const missingDefinitions = blockTypes.filter((type) => !Blockly.Blocks[type])
  const missingGenerators = blockTypes.filter((type) => typeof JavaScript[type] !== 'function')
  const diagnostics: CodeGenerationDiagnostic[] = []

  if (missingDefinitions.length) {
    diagnostics.push({
      stage: 'coverage',
      message: `缺少 Blockly 块定义：${missingDefinitions.join('、')}`,
    })
  }
  if (missingGenerators.length) {
    diagnostics.push({
      stage: 'coverage',
      message: `缺少 JavaScript Generator：${missingGenerators.join('、')}`,
    })
  }

  return diagnostics
}
