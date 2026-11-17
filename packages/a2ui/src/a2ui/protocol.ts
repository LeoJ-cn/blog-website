// 应用侧只从 @white55/a2ui-adapter 取协议运行时、渲染器与合并后的 catalog，
// 不直接依赖 @a2ui/react 与 @a2ui/web_core —— 那两个包由 adapter 包统一管理，
// 将来换渲染器或升协议版本时，改动收敛在 adapter 包内。
export * from '@white55/a2ui-adapter'
