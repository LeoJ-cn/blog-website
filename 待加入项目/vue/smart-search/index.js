import SmartSearch from './src/main'

/* istanbul ignore next */
SmartSearch.install = function (Vue) {
  Vue.component(SmartSearch.name, SmartSearch)
}

export default SmartSearch
