<template>
  <a class="nail-box" target="_blank" :debugger="imgSrc">
    <div v-show="status === LOADING" class="nail-box__loading">loading...</div>

    <img
      v-show="status === FAILURE"
      :src="noImage"
      alt="图片加载失败"
      class="no-image-placeholder"
    />

    <div
      v-show="type === IMAGE_TYPE_OFFICIAL && status === DONE"
      :key="`image-wrapper_${imgSrc}`"
      class="office-image-canvas-wrapper"
      ref="imageElementWrapper"
    />

    <div
      v-if="type !== IMAGE_TYPE_OFFICIAL"
      v-show="status !== LOADING"
      :style="cvsStyle"
      class="nail-box__img nail-box__img--pt other-image-canvas-wrapper"
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

<script setup lang="ts">
import { get } from 'lodash'
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import noImage from './no-image.png'
import { drawImageToCanvas, drawImageToHTMLNode } from './stream-loader_norxjs'

const IMAGE_TYPE_OFFICIAL = 'official'
const IMAGE_TYPE_OTHER = 'other'
const LOADING = 'loading'
const DONE = 'done'
const FAILURE = 'failure'

type LoadStatus = typeof LOADING | typeof DONE | typeof FAILURE
type CropBox = [number, number, number, number]

interface ImageModel {
  path: string
  box: CropBox
  oriWidth: number
  oriHeight: number
}

interface NailBoxImage {
  type: string
  src?: string
  thumbSrc?: string
  originSrc?: string
  model: ImageModel
}

interface ImageSize {
  width: number
  height: number
  origin?: boolean
}

interface Props {
  origin?: boolean
  image: NailBoxImage
}

type AbortImageLoad = () => void

const size: ImageSize = { width: 136, height: 182 }
const bigSize: ImageSize = { width: 500, height: 350 }
void IMAGE_TYPE_OTHER

const props = withDefaults(defineProps<Props>(), {
  origin: false,
})

const status = ref<LoadStatus>()
const cvsStyle = ref<{ width: string; height: string }>()
const imageElementWrapper = useTemplateRef<HTMLElement>('imageElementWrapper')
const canvasElementWrapper = useTemplateRef<HTMLElement>('canvasElementWrapper')

const type = computed<string>(() => get(props, 'image.type'))
const originSrc = computed<string | undefined>(() => get(props, 'image.originSrc'))
const model = computed<ImageModel>(() => get(props, 'image.model'))
const imgSrc = computed(() => {
  const src = get(props, 'image.src')
  return props.origin ? originSrc.value || src : get(props, 'image.thumbSrc', src)
})
const imgSize = computed(() => (props.origin ? bigSize : size))

let abortImageLoad: AbortImageLoad = () => undefined

function updateCanvasStyle() {
  const box = model.value.box
  const width = model.value.oriWidth * (box[2] - box[0])
  const height = model.value.oriHeight * (box[3] - box[1])

  if (imgSize.value.origin) {
    // 原图模式按裁剪区域等比缩放，避免固定容器比例拉伸裁剪结果。
    const ratio = Math.max(width / imgSize.value.width, height / imgSize.value.height)
    const cvsWidth = width / ratio
    const cvsHeight = height / ratio
    return {
      width: `${cvsWidth}px`,
      height: `${cvsHeight}px`,
    }
  }
}

function drawImage() {
  // props 变化时先取消上一条异步链，防止旧图片晚到后覆盖新图片。
  abortImageLoad()
  status.value = LOADING

  if (type.value === IMAGE_TYPE_OFFICIAL) {
    // 官方图片无需 Canvas 裁剪；缩略图失败后再尝试原图，兼顾首屏速度和可用性。
    const imgWrapperGetter = () => imageElementWrapper.value as HTMLElement
    if (!imgSrc.value) {
      status.value = FAILURE
      return
    }

    abortImageLoad = drawImageToHTMLNode(imgSrc.value, imgWrapperGetter, (error: unknown) => {
      if (!error) {
        status.value = DONE
        return
      }

      if (import.meta.env.MODE !== 'production') {
        const currentError = error as Error
        console.warn(`Loading Image with error: <${currentError.name}> ${currentError.message}:`)
      }
      abortImageLoad = drawImageToHTMLNode(
        originSrc.value as string,
        imgWrapperGetter,
        (fallbackError: unknown) => {
          status.value = fallbackError ? FAILURE : DONE
        },
      )
    })
    return
  }

  // 非官方图片通过归一化 box 从合图中裁剪，交给共享加载器统一处理并发和缓存。
  const { path, box, oriWidth, oriHeight } = model.value
  if (!path) {
    status.value = FAILURE
    return
  }

  const canvasWrapperGetter = () => canvasElementWrapper.value as HTMLElement
  abortImageLoad = drawImageToCanvas(
    path,
    canvasWrapperGetter,
    { width: oriWidth, height: oriHeight },
    box,
    imgSize.value,
    (error: unknown) => {
      status.value = error ? FAILURE : DONE
      if (error && import.meta.env.MODE !== 'production') {
        const currentError = error as Error
        console.warn(`Loading Image with error: <${currentError.name}> ${currentError.message}:`)
      }
      cvsStyle.value = updateCanvasStyle()
    },
  )
}

watch(
  () => props.image,
  (value, oldValue) => {
    // 与当前渲染路径相关的 URL 未变化时跳过重绘，避免无关字段更新触发重复解码。
    if (
      value.type === oldValue.type &&
      value.type === IMAGE_TYPE_OFFICIAL &&
      value.src === oldValue.src
    ) {
      return
    }

    if (
      value.type === oldValue.type &&
      value.type !== IMAGE_TYPE_OFFICIAL &&
      value.model.path === oldValue.model.path
    ) {
      return
    }

    drawImage()
  },
)

onMounted(drawImage)
onUnmounted(() => abortImageLoad())

defineExpose({
  noImage,
  IMAGE_TYPE_OFFICIAL,
  LOADING,
  DONE,
  FAILURE,
})
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

    &--pt {
      width: 100%;
      height: 100%;
    }
  }

  &__image-canvas {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__loading {
    align-items: center;
    display: flex;
    inset: 0;
    justify-content: center;
    position: absolute;
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
    display: block;
    object-fit: contain;
    position: absolute;
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
