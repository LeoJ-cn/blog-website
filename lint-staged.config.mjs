const quote = (file) => JSON.stringify(file)
const withoutTechnicalComponents = (files) =>
  files.filter((file) => !file.includes('/apps/web/src/components/'))

const command = (name, files) => {
  const targets = withoutTechnicalComponents(files)
  return targets.length > 0 ? `${name} ${targets.map(quote).join(' ')}` : []
}

export default {
  '*.{js,mjs,cjs,ts,vue}': (files) => command('eslint', files),
  '*.{css,scss,vue}': (files) => command('stylelint', files),
}
