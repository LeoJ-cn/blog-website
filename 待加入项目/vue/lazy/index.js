import directive from './src/directive'
import mixin from './src/mixin'
import ElLazy from './src/main'

/* istanbul ignore next */
ElLazy.install = function (Vue) {
  Vue.component(ElLazy.name, ElLazy)
  Vue.use('lazy', directive)
}
ElLazy.directive = directive
ElLazy.mixin = mixin

export default ElLazy
