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
}
