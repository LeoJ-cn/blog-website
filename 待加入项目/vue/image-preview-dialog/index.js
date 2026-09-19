import ImagePreviewDialog from './src/main'

/* istanbul ignore next */
ImagePreviewDialog.install = function (Vue) {
  Vue.component(ImagePreviewDialog.name, ImagePreviewDialog)
}

export default ImagePreviewDialog
