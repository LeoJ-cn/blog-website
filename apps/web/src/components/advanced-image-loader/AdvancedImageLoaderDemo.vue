<script setup lang="ts">
import { computed, ref } from 'vue'
import NailBox from './nail-box_zm.vue'
import { movingBoxManager } from './moving-box-manager'
// @ts-expect-error 该文件保留为可直接阅读的 JavaScript mock 源码。
import { getiMockImgList } from './mock.js'

type CropBox = [number, number, number, number]

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

type DataSet = 'basic' | 'stress'

const dataSet = ref<DataSet>('basic')
const useOrigin = ref(false)
const renderVersion = ref(0)
const cacheTimestamp = ref<number | null>(null)

const allImages = getiMockImgList()
const basicImages = allImages.slice(0, 4) as NailBoxImage[]
const stressImages = allImages.slice(0, 100) as NailBoxImage[]
const images = computed(() => {
  const currentImages = dataSet.value === 'basic' ? basicImages : stressImages
  const timestamp = cacheTimestamp.value

  if (timestamp === null) {
    return currentImages
  }

  return currentImages.map((image) => addCacheTimestamp(image, timestamp))
})
const officialCount = computed(() => images.value.filter((item) => item.type === 'official').length)
const canvasCount = computed(() => images.value.length - officialCount.value)
const errorCount = computed(
  () =>
    images.value.filter(
      (item) =>
        item.thumbSrc.includes('-error') ||
        item.originSrc.includes('-error') ||
        item.model.path.includes('-error'),
    ).length,
)

function selectDataSet(nextDataSet: DataSet) {
  dataSet.value = nextDataSet
  renderVersion.value += 1
}

function toggleOrigin() {
  renderVersion.value += 1
}

function addCacheTimestamp(image: NailBoxImage, timestamp: number): NailBoxImage {
  const withTimestamp = (url: string) => {
    const nextUrl = new URL(url)
    nextUrl.searchParams.set('t', String(timestamp))
    return nextUrl.toString()
  }

  return {
    ...image,
    src: withTimestamp(image.src),
    thumbSrc: withTimestamp(image.thumbSrc),
    originSrc: withTimestamp(image.originSrc),
    model: {
      ...image.model,
      path: withTimestamp(image.model.path),
    },
  }
}

function rerender() {
  cacheTimestamp.value = Date.now()
  renderVersion.value += 1
  movingBoxManager.requestPerformanceRecording()
}
</script>

<template>
  <section class="image-loader-demo">
    <aside class="image-loader-demo__controls">
      <div>
        <span class="image-loader-demo__label">数据规模</span>
        <div class="image-loader-demo__segmented">
          <button
            type="button"
            :class="{ 'is-active': dataSet === 'basic' }"
            @click="selectDataSet('basic')"
          >
            基础样例
          </button>
          <button
            type="button"
            :class="{ 'is-active': dataSet === 'stress' }"
            @click="selectDataSet('stress')"
          >
            并发压力
          </button>
        </div>
      </div>

      <label class="image-loader-demo__toggle">
        <input v-model="useOrigin" type="checkbox" @change="toggleOrigin" />
        <span>使用原图尺寸</span>
      </label>

      <button class="image-loader-demo__rerender" type="button" @click="rerender">
        重新执行加载(禁用缓存)
      </button>

      <dl class="image-loader-demo__summary">
        <div>
          <dt>本次提交</dt>
          <dd>{{ images.length }} 张图片</dd>
        </div>
        <div>
          <dt>HTML Image</dt>
          <dd>{{ officialCount }}</dd>
        </div>
        <div>
          <dt>Canvas Crop</dt>
          <dd>{{ canvasCount }}</dd>
        </div>
        <div>
          <dt>含错误 URL</dt>
          <dd>{{ errorCount }}</dd>
        </div>
      </dl>
    </aside>

    <div class="image-loader-demo__viewport">
      <div class="image-loader-demo__legend">
        <span>
          {{ dataSet === 'basic' ? '固定样例' : `${stressImages.length} 条随机压力数据` }}
        </span>
        <span>{{ useOrigin ? 'ORIGIN MODE' : 'THUMBNAIL MODE' }}</span>
      </div>
      <div
        class="image-loader-demo__gallery"
        data-testid="advanced-image-gallery"
        :data-render-version="renderVersion"
      >
        <article v-for="(item, index) in images" :key="`${renderVersion}-${index}`">
          <NailBox
            :key="`${renderVersion}-${useOrigin}-${index}`"
            :image="item"
            :origin="useOrigin"
          />
          <footer>
            <strong>{{ item.type === 'official' ? 'HTML Image' : 'Canvas Crop' }}</strong>
            <span>#{{ String(index + 1).padStart(3, '0') }}</span>
          </footer>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.image-loader-demo {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  min-height: 500px;
}

.image-loader-demo__controls {
  background: #0b1222;
  border-right: 1px solid #263453;
  padding: 24px;
}

.image-loader-demo__label {
  color: #71809e;
  display: block;
  font-size: 11px;
  margin-bottom: 9px;
}

.image-loader-demo__segmented {
  background: #111a2e;
  border: 1px solid #263453;
  border-radius: 6px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

.image-loader-demo__segmented button {
  background: transparent;
  border: 0;
  color: #71809e;
  cursor: pointer;
  font-size: 11px;
  padding: 9px 6px;
}

.image-loader-demo__segmented button.is-active {
  background: #263453;
  color: #f4f7ff;
}

.image-loader-demo__toggle {
  align-items: center;
  color: #9aa7c0;
  cursor: pointer;
  display: flex;
  font-size: 12px;
  gap: 9px;
  margin-top: 20px;
}

.image-loader-demo__toggle input {
  accent-color: #62e6b5;
}

.image-loader-demo__rerender {
  background: #62e6b5;
  border: 0;
  border-radius: 5px;
  color: #09131b;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  margin-top: 18px;
  padding: 10px 12px;
  width: 100%;
}

.image-loader-demo__summary {
  border-top: 1px solid #263453;
  display: grid;
  gap: 12px;
  margin: 24px 0 0;
  padding-top: 20px;
}

.image-loader-demo__summary div {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.image-loader-demo__summary dt {
  color: #71809e;
  font-size: 10px;
}

.image-loader-demo__summary dd {
  color: #dce5f7;
  font-family: monospace;
  font-size: 11px;
  margin: 0;
}

.image-loader-demo__viewport {
  min-width: 0;
  padding: 18px;
}

.image-loader-demo__legend {
  color: #71809e;
  display: flex;
  font-family: monospace;
  font-size: 10px;
  justify-content: space-between;
  letter-spacing: 0.08em;
  margin-bottom: 14px;
}

.image-loader-demo__gallery {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, 138px);
  justify-content: center;
  max-height: 540px;
  overflow: auto;
  padding: 2px;
}

.image-loader-demo__gallery article {
  background: #111a2e;
  border: 1px solid #263453;
  overflow: hidden;
}

.image-loader-demo__gallery footer {
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 9px 10px;
}

.image-loader-demo__gallery footer strong,
.image-loader-demo__gallery footer span {
  color: #71809e;
  font-family: monospace;
  font-size: 9px;
}

.image-loader-demo__gallery footer strong {
  color: #9aa7c0;
  font-weight: 500;
}

@media (max-width: 760px) {
  .image-loader-demo {
    grid-template-columns: 1fr;
  }

  .image-loader-demo__controls {
    border-bottom: 1px solid #263453;
    border-right: 0;
  }
}
</style>
