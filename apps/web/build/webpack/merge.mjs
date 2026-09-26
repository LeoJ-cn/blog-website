// 轻量配置合并器：对象递归合并，Loader/Plugin 数组合并。
export function mergeWebpackConfig(...configs) {
  return configs.reduce((result, config) => mergeValue(result, config), {})
}

function mergeValue(left, right) {
  if (Array.isArray(left) && Array.isArray(right)) return [...left, ...right]
  if (isObject(left) && isObject(right)) {
    const merged = { ...left }
    for (const [key, value] of Object.entries(right)) {
      // module.rules 是环境专属集合，生产规则应替换 common 规则而不是重复注册 loader。
      merged[key] = key === 'rules' ? value : key in merged ? mergeValue(merged[key], value) : value
    }
    return merged
  }
  return right
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
