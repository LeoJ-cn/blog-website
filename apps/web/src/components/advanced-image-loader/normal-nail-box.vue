<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import noImage from './no-image.png'

type CropBox = [number, number, number, number]
type LoadStatus = 'loading' | 'done' | 'failure'

interface NailBoxImage {
  type: string
  src: string
  thumbSrc: string
  originSrc: string
  model: {
    path: string
    box: CropBox
    oriWidth: number
    oriHeight: number
  }
}

const props = withDefaults(
  defineProps<{
    image: NailBoxImage
    origin?: boolean
  }>(),
  {
    origin: false,
  },
)

const status = ref<LoadStatus>('loading')
const imageWrapper = useTemplateRef<HTMLElement>('imageWrapper')
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const isOfficial = computed(() => props.image.type === 'official')
let currentImage: HTMLImageElement | undefined

function stopLoading() {
  if (!currentImage) return
  currentImage.onload = null
  currentImage.onerror = null
  currentImage.src = ''
  currentImage = undefined
}

function fail() {
  status.value = 'failure'
}

async function drawImage() {
  stopLoading()
  status.value = 'loading'
  await nextTick()

  const image = new Image()
  currentImage = image

  if (isOfficial.value) {
    image.src = props.origin
      ? props.image.originSrc || props.image.src
      : props.image.thumbSrc || props.image.src
    image.className = 'normal-nail-box__image'
    image.onload = () => {
      if (currentImage !== image || !imageWrapper.value) return
      imageWrapper.value.replaceChildren(image)
      status.value = 'done'
    }
    image.onerror = fail
    return
  }

  image.src = props.image.model.path
  image.onload = () => {
    if (currentImage !== image || !canvas.value) return

    const { box, oriWidth, oriHeight } = props.image.model
    const sourceX = oriWidth * box[0]
    const sourceY = oriHeight * box[1]
    const sourceWidth = oriWidth * (box[2] - box[0])
    const sourceHeight = oriHeight * (box[3] - box[1])
    const outputWidth = props.origin ? 500 : 136
    const outputHeight = props.origin ? 350 : 182
    const context = canvas.value.getContext('2d')

    if (!context) {
      fail()
      return
    }

    canvas.value.width = outputWidth
    canvas.value.height = outputHeight
    context.clearRect(0, 0, outputWidth, outputHeight)
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    )
    status.value = 'done'
  }
  image.onerror = fail
}

watch(() => [props.image, props.origin], drawImage)
onMounted(drawImage)
onUnmounted(stopLoading)
</script>

<template>
  <div class="normal-nail-box">
    <div v-show="status === 'loading'" class="normal-nail-box__loading">loading...</div>
    <img
      v-if="status === 'failure'"
      :src="noImage"
      alt="图片加载失败"
      class="normal-nail-box__fallback"
    />
    <div
      v-if="isOfficial && status !== 'failure'"
      ref="imageWrapper"
      class="normal-nail-box__wrapper"
    />
    <canvas v-else-if="status !== 'failure'" v-show="status === 'done'" ref="canvas" />
  </div>
</template>

<style scoped lang="scss">
.normal-nail-box {
  background: #fff;
  height: 184px;
  overflow: hidden;
  position: relative;
  width: 138px;
}

.normal-nail-box__loading {
  align-items: center;
  color: #111827;
  display: flex;
  inset: 0;
  justify-content: center;
  position: absolute;
}

.normal-nail-box__wrapper,
.normal-nail-box canvas,
.normal-nail-box__fallback {
  height: 100%;
  inset: 0;
  position: absolute;
  width: 100%;
}

.normal-nail-box__wrapper :deep(.normal-nail-box__image),
.normal-nail-box canvas {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.normal-nail-box__fallback {
  object-fit: contain;
}
</style>
