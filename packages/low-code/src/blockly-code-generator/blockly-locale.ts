import * as BlocklyCore from 'blockly/core'
import ZhHans from 'blockly/msg/zh-hans'

// Blockly 4 的 browser 入口会先求值内置 blocks，再在工厂函数中安装英文消息。
// Vite 转换 CommonJS 后，这个顺序会让 blocks 注册阶段提前解析 BKY 占位符并打印警告。
// 该前置模块必须在任何 `blockly` 主入口导入之前执行。
BlocklyCore.setLocale(ZhHans)
