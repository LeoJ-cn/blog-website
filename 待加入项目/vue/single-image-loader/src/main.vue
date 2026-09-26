<template>
  <div class="ai-common-image-loader">
    <div class="image-wrap" :style="cvsStyle">
      <canvas ref="canvas" class="image-canvas"></canvas>
      <!-- <a class="image-search" @click.stop="imageSearchClick" v-if="!preview">
        <img src="./images/icon_discovery.png" alt="">
        <span>{{$t('Discover')}}</span>
      </a> -->
    </div>
  </div>
</template>

<script>
import ThumbModel from './ThumbModel'
export default {
  name: 'AiCommonImageLoader',
  props: {
    item: {
      type: Object,
    },
    preview: {
      type: Boolean,
      default: false,
    },
    size: {
      default: {},
    },
  },
  data() {
    return {
      cvsStyle: {},
    }
  },
  async mounted() {
    const self = this
    await ThumbModel.drawImage(self.$refs.canvas, self.item, self.item.box, self.size)
    self.cvsStyle = this.getCvsStyle()
    self.$emit('imageLoaded', self.item.id + self.item.box.join(''))
  },
  methods: {
    imageSearchClick() {
      window.open('/search/image', '_blank')
    },
    getCvsStyle() {
      let box = this.item.box
      let width = this.item.oriWidth * (box[2] - box[0])
      let height = this.item.oriHeight * (box[3] - box[1])
      if (this.size.origin) {
        let redio = Math.max(width / this.size.width, height / this.size.height)
        let cvsWidth = width / redio
        let cvsHeight = height / redio
        return {
          width: cvsWidth + 'px',
          height: cvsHeight + 'px',
        }
      }
    },
  },
}
</script>
