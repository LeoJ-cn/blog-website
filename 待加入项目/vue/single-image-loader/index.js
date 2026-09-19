import ImageLoader from './src/main'

/* istanbul ignore next */
ImageLoader.install = function (Vue) {
  Vue.component(ImageLoader.name, ImageLoader)
}

export default ImageLoader
