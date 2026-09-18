<template>
  <a class="nail-box" target="_blank">
    <PianoLoading v-show="status === LOADING" />

    <div
      v-show="type === IMAGE_TYPE_OFFICIAL && status === FAILURE"
      key="no-image"
      class="no-image-placeholder"
    />

    <div
      v-show="type === IMAGE_TYPE_OFFICIAL && status === DONE"
      :key="`image-wrapper_${imgSrc}`"
      ref="imageElementWrapper"
    />

    <div
      v-if="type !== IMAGE_TYPE_OFFICIAL"
      v-show="status !== LOADING"
      :style="cvsStyle"
      class="nail-box__img nail-box__img--patsnap"
    >
      <div
        :key="`canvas-wrapper_${JSON.stringify(model)}`"
        ref="canvasElementWrapper"
        class="nail-box__image-wrapper"
      ></div>
    </div>
    <slot />
  </a>
</template>

<script>
/* eslint-disable */

import { get } from 'lodash'
import { drawImageToCanvas, drawImageToHTMLNode } from './stream-loader'
import { IMAGE_TYPE_OFFICIAL } from '../../utils/image-format'
import PianoLoading from 'library-@/components/PianoLoading'

const noImage = require('../../assets/images/no_image.svg')

const size = { width: 136, height: 182 }
const bigSize = { width: 500, height: 350 }

export default {
  components: {
    PianoLoading,
  },
  props: {
    origin: {
      type: Boolean,
      default: false,
    },
    image: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      status: this.LOADING,
      cvsStyle: undefined,
    }
  },
  computed: {
    type() {
      return get(this, 'image.type')
    },
    originSrc() {
      return get(this, 'image.originSrc')
    },
    model() {
      return get(this, 'image.model')
    },
    imgSrc() {
      const src = get(this, 'image.src')
      return this.origin ? this.originSrc || src : get(this, 'image.thumbSrc', src)
    },
    imgSize() {
      return this.origin ? bigSize : size
    },
  },
  watch: {
    image(value, old) {
      // 如果同时为 officical 时，src 也相同，不重新渲染
      if (value.type === old.type && value.type === IMAGE_TYPE_OFFICIAL && value.src === old.src) {
        return
      }

      // 如果同时为 patsnap 时，model.path 也相同，不重新渲染
      if (
        value.type === old.type &&
        value.type !== IMAGE_TYPE_OFFICIAL &&
        value.model.path === old.model.path
      ) {
        return
      }

      this.drawImage()
    },
  },
  created() {
    this.noImage = noImage
    this.IMAGE_TYPE_OFFICIAL = IMAGE_TYPE_OFFICIAL

    this.LOADING = 'loading'
    this.DONE = 'done'
    this.FAILURE = 'failure'
    this.$_abort = () => null
  },
  mounted() {
    this.drawImage()
  },
  unmounted() {
    this.$_abort()
  },
  methods: {
    drawImage() {
      this.$_abort()
      this.status = this.LOADING
      if (this.type === IMAGE_TYPE_OFFICIAL) {
        const imgWrapperGetter = () => this.$refs.imageElementWrapper
        if (!this.imgSrc) {
          this.status = this.FAILURE
          return
        }

        this.$_abort = drawImageToHTMLNode(this.imgSrc, imgWrapperGetter, (err) => {
          if (!err) {
            this.status = this.DONE
            return
          }
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`Loading Image with error: <${err.name}> ${err.message}:`)
          }
          this.$_abort = drawImageToHTMLNode(this.originSrc, imgWrapperGetter, (err) => {
            this.status = err ? this.FAILURE : this.DONE
          })
        })
      } else {
        const canvasWrapperGetter = () => this.$refs.canvasElementWrapper
        const { path, box, oriWidth, oriHeight } = this.model
        if (!path) {
          this.status = this.FAILURE
          return
        }
        const origin = { width: oriWidth, height: oriHeight }
        this.$_abort = drawImageToCanvas(
          path,
          canvasWrapperGetter,
          origin,
          box,
          this.imgSize,
          (err) => {
            this.status = err ? this.FAILURE : this.DONE
            if (err) {
              if (process.env.NODE_ENV !== 'production') {
                console.warn(`Loading Image with error: <${err.name}> ${err.message}:`)
              }
            }
            this.cvsStyle = this.updateCanvasStyle()
          },
        )
      }
    },
    updateCanvasStyle() {
      const box = this.model.box
      const width = this.model.oriWidth * (box[2] - box[0])
      const height = this.model.oriHeight * (box[3] - box[1])
      if (this.imgSize.origin) {
        const ratio = Math.max(width / this.imgSize.width, height / this.imgSize.height)
        const cvsWidth = width / ratio
        const cvsHeight = height / ratio
        return {
          width: `${cvsWidth}px`,
          height: `${cvsHeight}px`,
        }
      }
    },
  },
}
</script>

<style lang="scss">
$corner-size: 24px;

.nail-box {
  display: block;
  position: relative;
  background: #fff;
  height: 184px;
  width: 138px;
  overflow: hidden;
  &__img {
    display: block;
    position: absolute;
    user-select: none;
    top: 50%;
    left: 50%;
    margin-right: 50%;
    transform: translate(-50%, -50%);
    -ms-transform: translate(-50%, -50%);
    max-width: calc(100% - 1px);
    max-height: calc(100% - 1px);

    &--patsnap {
      width: 100%;
      height: 100%;
    }
  }

  &__image-canvas {
    max-width: 100%;
    max-height: 100%;
  }

  &__image-wrapper {
    overflow: hidden;
    text-align: center;
    width: 100%;
    height: 100%;
  }

  &__image-wrapper,
  &__image-canvas {
    vertical-align: middle;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    -ms-transform: translate(-50%, -50%);
    left: 50%;
  }

  .piano-loading {
    top: 50%;
    left: 50%;
    margin-right: 50%;
    transform: translate(-50%, -50%);
    -ms-transform: translate(-50%, -50%);
    width: calc(100% - 1px);
    height: auto;
  }

  .skeleton-pic-placeholder {
    width: calc(100% - 1px);
    height: calc(100% - 1px);
  }

  .no-image-placeholder {
    position: absolute;
    user-select: none;
    background-repeat: no-repeat;
    background-position: 50% 38%;
    user-select: none;
    top: 50%;
    left: 50%;
    margin-right: 50%;
    transform: translate(-50%, -50%);
    -ms-transform: translate(-50%, -50%);
    width: calc(100% - 1px);
    height: calc(100% - 1px);
  }
}
</style>
