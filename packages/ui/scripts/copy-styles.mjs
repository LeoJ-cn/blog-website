import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises'

const dist = new URL('../dist/', import.meta.url)
// 仅汇总本轮 Vite 生成的 CSS；先读取再复制手动样式，避免将覆盖样式重复收集。
const readBuiltStyles = async (directory) => {
  const styles = []
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = new URL(item.name + (item.isDirectory() ? '/' : ''), directory)
    if (item.isDirectory()) styles.push(...(await readBuiltStyles(path)))
    else if (item.name.endsWith('.css')) styles.push(await readFile(path, 'utf8'))
  }
  return styles
}
const fullStyles = (await readBuiltStyles(dist)).join('\n')
await mkdir(new URL('styles/', dist), { recursive: true })
await cp(new URL('../src/styles/', import.meta.url), new URL('styles/', dist), { recursive: true })
// 保留手动全量入口和旧 ui.css 路径；自动按需入口由 Vite 插件关联对应产物。
await writeFile(new URL('style.css', dist), fullStyles)
await writeFile(new URL('ui.css', dist), fullStyles)
