<template>
  <div class="container">
    <div class="header">
      <span>📋 列表 (共 {{ items.length }} 条)</span>
      <span v-if="loading" style="color: #1890ff">⏳ 生成中... ({{ progress }}%)</span>
      <span v-else-if="items.length === count" style="color: #52c41a">✅ 加载完成</span>
    </div>

    <div class="stats" v-if="items.length > 0">
      <span>🧮 总浮点: {{ totalStats.floatSum }}</span>
      <span>🔢 总素数: {{ totalStats.primeCount }}</span>
      <span>🌀 总斐波那契: {{ totalStats.fibMod }}</span>
      <span>📊 平均分: {{ totalStats.avgScore }}</span>
      <span>⏱️ 渲染时间: {{ renderTime }}ms</span>
      <span>💻 密集计算: 已启用 ({{ DENSE_DURATION }}ms)</span>
    </div>

    <div class="list-wrapper">
      <ul class="list">
        <li v-for="item in items" :key="item.id" class="list-item">
          <span class="id">#{{ item.id }}</span>
          <span class="base">base: {{ item.baseValue }}</span>
          <span class="calc-item">
            浮点:
            <span class="color-purple">{{ item.calc.floatSum }}</span>
          </span>
          <span class="calc-item">
            素数:
            <span class="color-orange">{{ item.calc.primeCount }}</span>
          </span>
          <span class="calc-item">
            斐波那契:
            <span class="color-cyan">{{ item.calc.fibMod }}</span>
          </span>
          <span class="calc-item">
            矩阵:
            <span class="color-red">{{ item.calc.matrixDet }}</span>
          </span>
          <span class="calc-item">
            π近似:
            <span class="color-green">{{ item.calc.piApprox }}</span>
          </span>
          <span class="calc-item">
            大数运算:
            <span class="color-gold">{{ item.calc.bigIntMod }}</span>
          </span>
          <span class="total">总分: {{ item.totalScore }}</span>
        </li>
      </ul>

      <div v-if="loading && items.length === 0" class="empty">
        ⏳ 正在执行密集计算 (预计 {{ DENSE_DURATION / 1000 }} 秒)...
      </div>
      <div v-else-if="items.length === 0" class="empty">📭 暂无数据</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, toRefs, computed } from 'vue'

// ============ 全局配置 ============
const CONFIG = {
  // 密集计算持续时间（毫秒）
  DENSE_DURATION: 50, // 5秒，可调整为 3000、8000、10000 等

  // 批次大小
  BATCH_SIZE: 5, // 正常批次大小
  QUICK_BATCH_SIZE: 50, // 快速完成批次大小

  // 计算精度
  PI_ITERATIONS: 10000,
  FLOAT_ITERATIONS: 8000,
  PRIME_MAX: 2000,
  BIG_INT_ITERATIONS: 1000,
}

// 解构全局配置
const {
  DENSE_DURATION,
  BATCH_SIZE,
  QUICK_BATCH_SIZE,
  PI_ITERATIONS,
  FLOAT_ITERATIONS,
  PRIME_MAX,
  BIG_INT_ITERATIONS,
} = CONFIG
// =================================

// 定义 props
const props = defineProps({
  count: {
    type: Number,
    default: 300,
  },
})

const { count } = toRefs(props)
const items = ref([])
const loading = ref(false)
const renderTime = ref(0)
const startTime = ref(0)
const progress = ref(0)

// 密集计算1: 矩阵行列式 (4x4)
function matrixDeterminant4x4(base) {
  const matrix = Array.from({ length: 4 }, (_, i) =>
    Array.from({ length: 4 }, (_, j) => ((base * (i + 1) * (j + 1) + i + j) % 20) + 1),
  )

  // 4x4 行列式展开
  let det = 0
  for (let i = 0; i < 4; i++) {
    const subMatrix = matrix.slice(1).map((row) => row.filter((_, j) => j !== i))
    const subDet =
      subMatrix[0][0] * (subMatrix[1][1] * subMatrix[2][2] - subMatrix[1][2] * subMatrix[2][1]) -
      subMatrix[0][1] * (subMatrix[1][0] * subMatrix[2][2] - subMatrix[1][2] * subMatrix[2][0]) +
      subMatrix[0][2] * (subMatrix[1][0] * subMatrix[2][1] - subMatrix[1][1] * subMatrix[2][0])
    det += (i % 2 === 0 ? 1 : -1) * matrix[0][i] * subDet
  }
  return det
}

// 密集计算2: 蒙特卡洛π近似 (高精度)
function piApproximation(seed) {
  let inside = 0
  const iterations = PI_ITERATIONS
  let x = (seed * 0.618033988749895) % 1
  let y = (seed * 0.381966011250105) % 1
  let z = (seed * 0.23606797749979) % 1

  for (let i = 0; i < iterations; i++) {
    x = ((x * 1103515245 + 12345) % 2147483647) / 2147483647
    y = ((y * 1103515245 + 12345) % 2147483647) / 2147483647
    z = ((z * 1103515245 + 12345) % 2147483647) / 2147483647
    // 3D 球体体积估算
    if (x * x + y * y + z * z <= 1) inside++
  }
  return ((6 * inside) / iterations).toFixed(6)
}

// 密集计算3: 大整数运算
function bigIntModulo(base) {
  let result = BigInt(1)
  const bigBase = BigInt(base + 100)
  const mod = BigInt(1000000007)

  for (let i = 0; i < BIG_INT_ITERATIONS; i++) {
    result = (result * bigBase) % mod
  }
  return Number(result)
}

// 密集计算4: 质数密集型检查
function heavyPrimeCount(base) {
  let count = 0
  let maxCheck = PRIME_MAX

  for (let i = 2; i < maxCheck; i++) {
    let isPrime = true
    for (let j = 2; j * j <= i; j++) {
      if (i % j === 0) {
        isPrime = false
        break
      }
    }
    if (isPrime && base % i === 0) count++
  }
  return count
}

// 密集计算5: 浮点密集型运算
function heavyFloatSum(base) {
  let sum = 0
  const iterations = FLOAT_ITERATIONS

  for (let i = 0; i < iterations; i++) {
    sum += Math.sin(i * base * 0.001) * Math.cos(i / 3 + base * 0.001)
    sum += Math.tan(i * 0.001) * Math.log(i + 1 + base * 0.001)
    sum += Math.pow(Math.sin(i * 0.01), 2) * Math.pow(Math.cos(i * 0.01), 2)
  }
  return sum
}

// 主计算函数 (密集模式)
function denseCalc(base) {
  // 浮点密集计算
  const floatSum = heavyFloatSum(base)

  // 素数密集计算
  const primeCount = heavyPrimeCount(base)

  // 斐波那契 (轻量)
  const fibMod = ((base % 20) + 10) % 30

  // 矩阵行列式
  const matrixDet = matrixDeterminant4x4(base)

  // π近似
  const piApprox = piApproximation(base)

  // 大整数运算
  const bigIntMod = bigIntModulo(base)

  return {
    floatSum: floatSum.toFixed(2),
    primeCount,
    fibMod,
    matrixDet: matrixDet.toFixed(2),
    piApprox,
    bigIntMod,
    total: (floatSum + primeCount * 10 + fibMod + matrixDet * 0.01 + bigIntMod * 0.1).toFixed(2),
  }
}

function generateList() {
  loading.value = true
  progress.value = 0
  startTime.value = performance.now()
  const result = []
  let index = 0
  const total = count.value

  function generateBatch() {
    const end = Math.min(index + BATCH_SIZE, total)

    // 计算当前批次
    for (let i = index; i < end; i++) {
      const base = (i * 13 + 7) % 997
      const calc = denseCalc(base)
      result.push({
        id: i + 1,
        baseValue: base,
        calc: calc,
        totalScore: calc.total,
      })
    }

    index = end
    items.value = [...result]
    progress.value = Math.round((index / total) * 100)

    // 检查是否完成
    const elapsed = performance.now() - startTime.value

    if (index < total && elapsed < DENSE_DURATION) {
      // 未到设定时间，继续分批生成
      setTimeout(generateBatch, 0)
    } else if (index < total && elapsed >= DENSE_DURATION) {
      // 已到设定时间但未完成，快速完成剩余数据
      quickFinish()
    } else {
      // 已完成
      finishGeneration()
    }
  }

  function quickFinish() {
    // 快速完成剩余数据（加大批次）
    const remaining = total - index
    const batchSize = remaining > QUICK_BATCH_SIZE ? QUICK_BATCH_SIZE : remaining
    const end = Math.min(index + batchSize, total)

    for (let i = index; i < end; i++) {
      const base = (i * 13 + 7) % 997
      const calc = denseCalc(base)
      result.push({
        id: i + 1,
        baseValue: base,
        calc: calc,
        totalScore: calc.total,
      })
    }

    index = end
    items.value = [...result]
    progress.value = Math.round((index / total) * 100)

    if (index < total) {
      // 继续快速完成
      setTimeout(quickFinish, 0)
    } else {
      finishGeneration()
    }
  }

  function finishGeneration() {
    loading.value = false
    renderTime.value = Math.round(performance.now() - startTime.value)
    console.log(
      `✅ 生成完成！共 ${result.length} 条，耗时 ${renderTime.value}ms，密集计算持续 ${DENSE_DURATION}ms`,
    )
  }

  // 开始分批生成
  setTimeout(generateBatch, 0)
}

// 计算统计信息
const totalStats = computed(() => {
  if (items.value.length === 0) {
    return { floatSum: 0, primeCount: 0, fibMod: 0, avgScore: 0 }
  }

  let floatSum = 0
  let primeCount = 0
  let fibMod = 0
  let totalScore = 0

  items.value.forEach((item) => {
    floatSum += parseFloat(item.calc.floatSum) || 0
    primeCount += item.calc.primeCount || 0
    fibMod += item.calc.fibMod || 0
    totalScore += parseFloat(item.totalScore) || 0
  })

  return {
    floatSum: floatSum.toFixed(2),
    primeCount,
    fibMod,
    avgScore: (totalScore / items.value.length).toFixed(2),
  }
})

onMounted(() => {
  generateList()
})
</script>

<style scoped>
.container {
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
}
.header {
  margin-bottom: 12px;
  padding: 10px 16px;
  background: #f0f2f5;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
}
.stats {
  margin-bottom: 12px;
  padding: 8px 16px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: #555;
}
.stats strong {
  color: #333;
}
.list-wrapper {
  height: 200px;
  overflow-y: auto;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 8px;
  background: #fafafa;
}
.list-wrapper::-webkit-scrollbar {
  width: 6px;
}
.list-wrapper::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 3px;
}
.list-wrapper::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}
.list-wrapper::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.list-item {
  padding: 6px 12px;
  margin-bottom: 3px;
  background: white;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  border-left: 3px solid #1890ff;
  transition: all 0.1s;
  flex-wrap: wrap;
  gap: 4px 8px;
}
.list-item:hover {
  background: #f6f8fa;
}
.id {
  font-weight: bold;
  color: #1890ff;
  flex: 0 0 auto;
}
.base {
  color: #999;
  flex: 0 0 auto;
}
.calc-item {
  color: #333;
  flex: 0 0 auto;
}
.color-purple {
  color: #722ed1;
}
.color-orange {
  color: #fa8c16;
}
.color-cyan {
  color: #13c2c2;
}
.color-red {
  color: #eb2f96;
}
.color-green {
  color: #52c41a;
}
.color-gold {
  color: #faad14;
}
.total {
  font-weight: bold;
  color: #eb2f96;
  flex: 0 0 auto;
}
.empty {
  text-align: center;
  padding: 60px 0;
  color: #bbb;
}
</style>
