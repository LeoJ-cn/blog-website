const quote = (file) => JSON.stringify(file)
const withoutIgnoredPaths = (files) =>
  files.filter(
    (file) =>
      !file.includes('/apps/web/src/components/') && !/[\\/]待加入项目[\\/]/.test(file),
  )

const command = (name, files) => {
  const targets = withoutIgnoredPaths(files)
  return targets.length > 0 ? `${name} ${targets.map(quote).join(' ')}` : []
}

export default {
  '*.{js,mjs,cjs,ts,vue}': (files) => command('eslint', files),
  // CSS 的注释空行、声明顺序等规则由 Stylelint 负责，ESLint 与 Prettier 都不覆盖。
  // 这里只收独立样式文件：.vue 的 <style> 交给 ESLint 那条规则，
  // 否则同一文件会命中两组命令，lint-staged 默认并发执行，两个进程同时改写同一文件会互相覆盖。
  '*.{css,scss}': (files) => command('stylelint --fix', files),
}
