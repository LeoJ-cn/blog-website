import ImagePanel from './src/main'

/* istanbul ignore next */
ImagePanel.install = function (Vue) {
  Vue.component(ImagePanel.name, ImagePanel)
}

export default ImagePanel
