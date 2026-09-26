/* eslint-disable */

/**
 * ============================================================
 * 设备性能分级检测 + 设备型号识别 + 熔断机制 + 分层设备信息
 * ============================================================
 * 分层设计：
 * - performanceDetails: 性能评分相关参数
 * - deviceDetails: 完整设备参数（包含性能参数及其中文标签）
 * 评分逻辑保持不变，设备信息仅记录不参与评分。
 */

/**
 * 动态加载 ua-parser-js CDN
 */
function loadUAParser() {
  return new Promise((resolve, reject) => {
    if (window.UAParser) return resolve()
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/ua-parser-js@1.0.37/dist/ua-parser.min.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load ua-parser-js'))
    document.head.appendChild(script)
  })
}

/**
 * 异步获取高熵 User-Agent Client Hints（如果支持）
 */
async function getHighEntropyData() {
  if (!navigator.userAgentData || !navigator.userAgentData.getHighEntropyValues) {
    return null
  }
  try {
    return await navigator.userAgentData.getHighEntropyValues([
      'model',
      'platformVersion',
      'architecture',
      'bitness',
      'fullVersionList',
    ])
  } catch (e) {
    return null
  }
}

/**
 * 异步获取电池信息（如果支持）
 */
async function getBatteryInfo() {
  if (!navigator.getBattery) return null
  try {
    const battery = await navigator.getBattery()
    return {
      charging: battery.charging,
      level: battery.level,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime,
    }
  } catch (e) {
    return null
  }
}

/**
 * 获取网络信息（如果支持）
 */
function getNetworkInfo() {
  if (!navigator.connection) return null
  return {
    effectiveType: navigator.connection.effectiveType || null,
    downlink: navigator.connection.downlink || null,
    rtt: navigator.connection.rtt || null,
    saveData: navigator.connection.saveData || false,
  }
}

/**
 * 设备信息获取（包含具体型号、厂商、完整设备参数）
 */
function getDeviceInfo(highEntropy = null) {
  const ua = navigator.userAgent
  const touchPoints = navigator.maxTouchPoints || 0
  const platform = navigator.platform || ''
  const screenW = Math.max(screen.width, screen.height)

  // 1. 物流/工业设备优先识别
  const ruggedPatterns = [
    'Zebra',
    'Honeywell',
    'Datalogic',
    'Panasonic',
    'TC5',
    'TC7',
    'TC2',
    'MC33',
    'MC93',
    'CK3',
    'CN51',
    'CT40',
    'EDA50',
    'EDA51',
    'Memor',
    'i6200',
    'N5S',
    'Urovo',
    'PDA',
    'Scanner',
    'Rugged',
    'Handheld',
    'Industrial',
  ]
  const isRugged = ruggedPatterns.some((p) => ua.includes(p))

  let vendor = ''
  let model = ''

  // 2. UA Client Hints 高熵数据
  if (highEntropy && highEntropy.model) {
    model = highEntropy.model
    if (/MacBook|Mac/i.test(model)) vendor = 'Apple'
    else if (/iPhone|iPad/i.test(model)) vendor = 'Apple'
    else if (/SM-|Galaxy/i.test(model)) vendor = 'Samsung'
    else if (/Pixel/i.test(model)) vendor = 'Google'
  }

  // 3. ua-parser-js 解析
  if ((!vendor || !model) && window.UAParser) {
    try {
      const parser = new UAParser()
      const result = parser.getResult()
      if (!vendor) vendor = result.device.vendor || ''
      if (!model) model = result.device.model || ''
    } catch (e) {}
  }

  // 4. 内置正则兜底
  if (!vendor || !model) {
    const fallback = parseCommonDevices(ua)
    if (!vendor) vendor = fallback.vendor || ''
    if (!model) model = fallback.model || ''
  }

  // 5. 确定设备类型（优先 ua-parser-js，否则原生判断）
  let deviceType = ''
  let uaParserType = ''
  if (window.UAParser) {
    try {
      uaParserType = new UAParser().getResult().device.type || ''
    } catch (e) {}
  }

  if (uaParserType === 'mobile') {
    deviceType = 'MOBILE'
  } else if (uaParserType === 'tablet') {
    deviceType = 'TABLET'
  } else if (['console', 'smarttv', 'wearable', 'embedded'].includes(uaParserType)) {
    deviceType = 'UNKNOWN'
  } else {
    const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(platform) || /Mac OS X/.test(ua)
    const isWindows = /Win32|Win64|Windows/.test(platform) || /Windows NT/.test(ua)
    const isLinux = /Linux/.test(platform) && !/Android/.test(ua)
    const isDesktopOS = isMac || isWindows || isLinux
    const isMobileUA = /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(ua)

    if (isDesktopOS && !isMobileUA) {
      deviceType = 'DESKTOP'
    } else {
      const isTabletUA = /iPad|PlayBook|Silk|Android.*Tablet/i.test(ua)
      if (isTabletUA && touchPoints > 2 && screenW >= 768) {
        deviceType = 'TABLET'
      } else if (isMobileUA && touchPoints > 0 && screenW < 768) {
        deviceType = 'MOBILE'
      } else if (touchPoints > 0) {
        deviceType = screenW < 768 ? 'MOBILE' : 'TABLET'
      } else {
        deviceType = 'UNKNOWN'
      }
    }
  }

  if (isRugged) {
    deviceType = 'RUGGED'
    vendor = vendor || 'Industrial'
    model = model || 'Rugged Device'
  }

  // 6. 浏览器信息
  let browserName = '',
    browserVersion = ''
  if (window.UAParser) {
    try {
      const browser = new UAParser().getResult().browser
      browserName = browser.name || ''
      browserVersion = browser.version || ''
    } catch (e) {}
  }
  if (!browserName) {
    if (/Chrome\/([\d.]+)/.test(ua)) {
      browserName = 'Chrome'
      browserVersion = RegExp.$1
    } else if (/Firefox\/([\d.]+)/.test(ua)) {
      browserName = 'Firefox'
      browserVersion = RegExp.$1
    } else if (/Safari\/([\d.]+)/.test(ua)) {
      browserName = 'Safari'
      browserVersion = RegExp.$1
    } else if (/Edge\/([\d.]+)/.test(ua)) {
      browserName = 'Edge'
      browserVersion = RegExp.$1
    }
  }

  // 7. OS 信息
  let osName = '',
    osVersion = ''
  if (window.UAParser) {
    try {
      const os = new UAParser().getResult().os
      osName = os.name || ''
      osVersion = os.version || ''
    } catch (e) {}
  }
  if (!osName) {
    if (/Windows NT ([\d.]+)/.test(ua)) {
      osName = 'Windows'
      osVersion = RegExp.$1
    } else if (/Mac OS X ([\d_]+)/.test(ua)) {
      osName = 'macOS'
      osVersion = RegExp.$1.replace(/_/g, '.')
    } else if (/Android ([\d.]+)/.test(ua)) {
      osName = 'Android'
      osVersion = RegExp.$1
    } else if (/iPhone OS ([\d_]+)/.test(ua)) {
      osName = 'iOS'
      osVersion = RegExp.$1.replace(/_/g, '.')
    }
  }

  return {
    type: deviceType,
    vendor,
    model,
    ua,
    platform,
    screen: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
    },
    touchPoints,
    language: navigator.language || '',
    languages: navigator.languages || [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    browser: { name: browserName, version: browserVersion },
    os: { name: osName, version: osVersion },
    userAgentData: navigator.userAgentData
      ? {
          brands: navigator.userAgentData.brands,
          mobile: navigator.userAgentData.mobile,
          platform: navigator.userAgentData.platform,
        }
      : null,
    highEntropy: highEntropy || null,
    isRugged,
  }
}

/**
 * 内置正则兜底识别常见品牌
 */
function parseCommonDevices(ua) {
  const patterns = [
    { vendor: 'Apple', model: 'iPhone', regex: /iPhone/ },
    { vendor: 'Apple', model: 'iPad', regex: /iPad/ },
    { vendor: 'Apple', model: 'MacBook', regex: /MacBook/ },
    { vendor: 'Apple', model: 'Mac', regex: /Macintosh/ },
    { vendor: 'Samsung', model: 'Galaxy S', regex: /SM-G\d{3}/ },
    { vendor: 'Samsung', model: 'Galaxy Note', regex: /SM-N\d{3}/ },
    { vendor: 'Google', model: 'Pixel', regex: /Pixel/ },
    { vendor: 'Huawei', model: 'Huawei', regex: /Huawei|Honor/ },
    { vendor: 'Xiaomi', model: 'Xiaomi', regex: /Xiaomi|Redmi/ },
    { vendor: 'OPPO', model: 'OPPO', regex: /OPPO/ },
    { vendor: 'vivo', model: 'vivo', regex: /vivo/ },
    { vendor: 'OnePlus', model: 'OnePlus', regex: /OnePlus/ },
  ]
  for (const p of patterns) {
    if (p.regex.test(ua)) return { vendor: p.vendor, model: p.model }
  }
  return {}
}

/**
 * 设备性能分级检测（含熔断机制，分层返回）
 */
export async function detectPerformanceTier() {
  // 先尝试加载 ua-parser-js
  try {
    await loadUAParser()
  } catch (e) {
    console.warn('ua-parser-js 加载失败，将使用内置正则识别设备', e)
  }

  // 并行获取异步数据
  const [highEntropy, batteryInfo] = await Promise.all([getHighEntropyData(), getBatteryInfo()])

  const networkInfo = getNetworkInfo()

  // 采集性能相关静态指标
  const cores = navigator.hardwareConcurrency || 4
  const memory = navigator.deviceMemory || 4
  const dpr = window.devicePixelRatio || 1

  // 获取完整设备信息
  const deviceInfo = getDeviceInfo(highEntropy)

  // 评分逻辑（与之前验证为 95 分的版本完全一致）
  let cpuScore = 0
  if (cores >= 16) cpuScore = 100
  else if (cores >= 12) cpuScore = 90
  else if (cores >= 8) cpuScore = 80
  else if (cores >= 6) cpuScore = 65
  else if (cores >= 4) cpuScore = 45
  else if (cores >= 2) cpuScore = 25
  else cpuScore = 10

  let memScore = 0
  if (memory >= 16) memScore = 100
  else if (memory >= 12) memScore = 90
  else if (memory >= 8) memScore = 80
  else if (memory >= 6) memScore = 70
  else if (memory >= 4) memScore = 55
  else if (memory >= 2) memScore = 35
  else if (memory >= 1) memScore = 20
  else memScore = 10

  const dprPenalty = dpr >= 3 ? 10 : dpr >= 2 ? 5 : 0
  const staticWeighted = cpuScore * 0.3 + memScore * 0.25 + (100 - dprPenalty) * 0.1

  // 熔断判断
  const ABORT_STATIC_THRESHOLD = 20
  let dynamicScore = 0
  let benchmarkAborted = false
  let abortReason = ''

  if (staticWeighted < ABORT_STATIC_THRESHOLD) {
    benchmarkAborted = true
    abortReason = 'static score too low, skip benchmark'
    dynamicScore = 0
  } else {
    const result = await runBenchmarkWithCircuitBreaker()
    dynamicScore = result.score
    benchmarkAborted = result.aborted
    abortReason = result.aborted ? 'benchmark time budget exceeded' : ''
  }

  const score = Math.round(staticWeighted + dynamicScore * 0.35)

  let tier, tierLabel
  if (score >= 80) {
    tier = 'FLAGSHIP'
    tierLabel = '旗舰级'
  } else if (score >= 65) {
    tier = 'HIGH_PERF'
    tierLabel = '高性能级'
  } else if (score >= 50) {
    tier = 'MAINSTREAM'
    tierLabel = '主流级'
  } else if (score >= 35) {
    tier = 'ENTRY'
    tierLabel = '入门级'
  } else {
    tier = 'CONSTRAINED'
    tierLabel = '受限级'
  }

  // 性能参数
  const performanceDetails = {
    cores,
    memory,
    dpr,
    cpuScore,
    memScore,
    staticWeighted: Math.round(staticWeighted),
    dynamicScore,
    benchmarkAborted,
    abortReason,
  }

  // 性能字段中文标签映射
  const performanceLabels = {
    cores: 'CPU核心数',
    memory: '内存(GB)',
    dpr: '设备像素比',
    cpuScore: 'CPU得分',
    memScore: '内存得分',
    staticWeighted: '静态加权分',
    dynamicScore: '动态基准得分',
    benchmarkAborted: '是否熔断',
    abortReason: '熔断原因',
  }

  // 构建完整设备参数（包含设备信息和性能参数及标签）
  const deviceDetails = {
    ...deviceInfo, // 设备类型、厂商、型号、屏幕、语言等
    battery: batteryInfo,
    network: networkInfo,
    hardwareConcurrency: cores,
    deviceMemory: memory,
    devicePixelRatio: dpr,
    ...performanceDetails, // 展开性能字段
  }

  // 为每个性能字段添加中文标签
  for (const key of Object.keys(performanceDetails)) {
    deviceDetails[`${key}_label`] = performanceLabels[key] || ''
  }

  return {
    tier,
    tierLabel,
    score,
    performanceDetails,
    deviceDetails,
  }
}

/**
 * 带时间熔断的动态基准测试
 */
function runBenchmarkWithCircuitBreaker() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = performance.now()
      const BUDGET_MS = 150
      let result = 0
      const arr = new Array(10000).fill(0).map((_, i) => i)
      let i = 0
      const maxIterations = 50000
      let aborted = false

      for (; i < maxIterations; i++) {
        result += Math.sqrt(arr[i % 10000]) * Math.sin(i) + Math.cos(i)
        arr[i % 10000] = result % 1000
        if (i % 100 === 0) {
          const elapsed = performance.now() - start
          if (elapsed > BUDGET_MS) {
            aborted = true
            break
          }
        }
      }

      const elapsed = performance.now() - start
      let score
      if (aborted) {
        score = Math.max(0, Math.round(30 - (elapsed - BUDGET_MS) / 10))
      } else {
        score = 100 - (elapsed - 50) * (100 / 950)
        score = Math.max(0, Math.min(100, Math.round(score)))
      }
      resolve({ score, aborted, elapsed: Math.round(elapsed) })
    }, 50)
  })
}

/**
 * 将检测结果渲染为 HTML 报告（包含性能卡片和完整设备信息）
 */
export function renderPerformanceReport(result) {
  const { tier, tierLabel, score, performanceDetails, deviceDetails } = result

  const tierColorMap = {
    FLAGSHIP: '#af52de',
    HIGH_PERF: '#4f8cff',
    MAINSTREAM: '#34c759',
    ENTRY: '#ff9500',
    CONSTRAINED: '#ff3b30',
  }

  const color = tierColorMap[tier] || '#888'

  // =========================
  // 主容器
  // =========================
  const container = document.querySelector('#test-ua') || document.createElement('div')

  container.replaceChildren()

  // 容器参数
  container.dataset.tier = tier ?? ''
  container.dataset.tierLabel = tierLabel ?? ''
  container.dataset.score = String(score ?? '')

  container.dataset.cores = String(performanceDetails.cores ?? '')
  container.dataset.memory = String(performanceDetails.memory ?? '')
  container.dataset.dpr = String(performanceDetails.dpr ?? '')
  container.dataset.cpuScore = String(performanceDetails.cpuScore ?? '')
  container.dataset.memScore = String(performanceDetails.memScore ?? '')
  container.dataset.staticWeighted = String(performanceDetails.staticWeighted ?? '')
  container.dataset.dynamicScore = String(performanceDetails.dynamicScore ?? '')
  container.dataset.benchmarkAborted = String(performanceDetails.benchmarkAborted ?? false)
  container.dataset.abortReason = performanceDetails.abortReason ?? ''

  // 设备参数
  container.dataset.deviceType = deviceDetails.type ?? ''
  container.dataset.vendor = deviceDetails.vendor ?? ''
  container.dataset.model = deviceDetails.model ?? ''
  container.dataset.platform = deviceDetails.platform ?? ''
  container.dataset.browser = deviceDetails.browser?.name ?? ''
  container.dataset.browserVersion = deviceDetails.browser?.version ?? ''
  container.dataset.os = deviceDetails.os?.name ?? ''
  container.dataset.osVersion = deviceDetails.os?.version ?? ''

  container.style.cssText = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1a1d27;
    color: #e0e0e0;
    border-radius: 12px;
    padding: 20px;
    max-width: 700px;
    margin: 20px auto;
    border: 1px solid #2a2d3a;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `

  // =========================
  // 头部
  // =========================
  const header = document.createElement('div')

  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  `

  const nameSpan = document.createElement('span')
  nameSpan.textContent = `${tierLabel} (${tier})`

  nameSpan.style.cssText = `
    font-size: 1.5rem;
    font-weight: 700;
    color: ${color};
  `

  const scoreSpan = document.createElement('span')
  scoreSpan.textContent = `综合评分: ${score}`

  scoreSpan.style.cssText = `
    font-size: 1rem;
    color: #8899aa;
  `

  header.appendChild(nameSpan)
  header.appendChild(scoreSpan)
  container.appendChild(header)

  // =========================
  // 评分条
  // =========================
  const barWrap = document.createElement('div')

  barWrap.style.cssText = `
    height: 8px;
    background: #2a2d3a;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 16px;
  `

  const barFill = document.createElement('div')

  barFill.style.cssText = `
    height: 100%;
    width: ${Math.min(100, Math.max(0, score))}%;
    background: ${color};
    border-radius: 4px;
    transition: width 0.6s ease;
  `

  barWrap.appendChild(barFill)
  container.appendChild(barWrap)

  // =========================
  // 性能参数网格
  // =========================
  const perfGrid = document.createElement('div')

  perfGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  `

  const perfLabels = {
    cores: 'CPU 核心数',
    memory: '内存 (GB)',
    dpr: '设备像素比',
    cpuScore: 'CPU 得分',
    memScore: '内存得分',
    staticWeighted: '静态加权分',
    dynamicScore: '动态基准得分',
    benchmarkAborted: '是否熔断',
    abortReason: '熔断原因',
  }

  Object.keys(performanceDetails).forEach((key) => {
    const cell = document.createElement('div')

    cell.style.cssText = `
      background: #22252f;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    `

    const label = document.createElement('div')
    label.textContent = perfLabels[key] || key

    label.style.cssText = `
      font-size: 0.75rem;
      color: #8899aa;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    `

    const value = document.createElement('div')
    value.textContent = performanceDetails[key]

    value.style.cssText = `
      font-size: 1.1rem;
      font-weight: 600;
    `

    cell.appendChild(label)
    cell.appendChild(value)
    perfGrid.appendChild(cell)
  })

  container.appendChild(perfGrid)

  // =========================
  // 熔断提示
  // =========================
  if (performanceDetails.benchmarkAborted) {
    const abortDiv = document.createElement('div')

    abortDiv.style.cssText = `
      background: rgba(255,59,48,0.15);
      border: 1px solid rgba(255,59,48,0.4);
      color: #ff6b61;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 0.85rem;
      margin-bottom: 8px;
    `

    abortDiv.textContent = `⚠️ 检测熔断: ${performanceDetails.abortReason || '未知原因'}`

    container.appendChild(abortDiv)
  }

  // =========================
  // 渲染建议
  // =========================
  const renderCountMap = {
    FLAGSHIP: '全部区域',
    HIGH_PERF: '8 个区域',
    MAINSTREAM: '5 个区域',
    ENTRY: '2 个区域',
    CONSTRAINED: '1 个区域（逐个渲染）',
  }

  const suggestDiv = document.createElement('div')

  suggestDiv.style.cssText = `
    background: rgba(79,140,255,0.1);
    border: 1px solid rgba(79,140,255,0.3);
    color: #6ea8ff;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 16px;
  `

  suggestDiv.textContent = `建议首屏渲染: ${renderCountMap[tier] || '根据实际情况调整'}`

  container.appendChild(suggestDiv)

  // =========================
  // 设备详情
  // =========================
  const detailsTitle = document.createElement('div')
  detailsTitle.textContent = '完整设备参数'

  detailsTitle.style.cssText = `
    font-size: 1rem;
    font-weight: 600;
    color: #8899aa;
    margin-bottom: 8px;
  `

  container.appendChild(detailsTitle)

  const deviceDetailsList = document.createElement('div')

  deviceDetailsList.style.cssText = `
    background: #22252f;
    border-radius: 8px;
    padding: 12px;
    font-size: 0.85rem;
    line-height: 1.6;
  `

  const detailRows = [
    ['设备类型', deviceDetails.type || 'UNKNOWN'],
    ['厂商', deviceDetails.vendor || '未知'],
    ['型号', deviceDetails.model || '未知'],
    ['User Agent', deviceDetails.ua || ''],
    ['平台', deviceDetails.platform || ''],

    [
      '屏幕分辨率',
      deviceDetails.screen
        ? `${deviceDetails.screen.width} × ${deviceDetails.screen.height}`
        : '未知',
    ],

    [
      '可用屏幕',
      deviceDetails.screen
        ? `${deviceDetails.screen.availWidth} × ${deviceDetails.screen.availHeight}`
        : '未知',
    ],

    ['颜色深度', deviceDetails.screen?.colorDepth || '未知'],
    ['触控点数', deviceDetails.touchPoints ?? '未知'],
    ['语言', deviceDetails.language || '未知'],
    ['语言列表', deviceDetails.languages?.join(', ') || ''],
    ['时区', deviceDetails.timezone || '未知'],

    [
      '浏览器',
      deviceDetails.browser
        ? `${deviceDetails.browser.name} ${deviceDetails.browser.version}`
        : '未知',
    ],

    [
      '操作系统',
      deviceDetails.os ? `${deviceDetails.os.name} ${deviceDetails.os.version}` : '未知',
    ],

    [
      'User Agent Data',
      deviceDetails.userAgentData ? JSON.stringify(deviceDetails.userAgentData) : '不支持',
    ],

    ['高熵数据', deviceDetails.highEntropy ? JSON.stringify(deviceDetails.highEntropy) : '不支持'],

    ['电池状态', deviceDetails.battery ? JSON.stringify(deviceDetails.battery) : '不支持'],

    ['网络信息', deviceDetails.network ? JSON.stringify(deviceDetails.network) : '不支持'],

    // 性能参数
    ['CPU 核心数', deviceDetails.cores ?? '未知'],
    ['内存 (GB)', deviceDetails.memory ?? '未知'],
    ['设备像素比', deviceDetails.dpr ?? '未知'],
    ['CPU 得分', deviceDetails.cpuScore ?? 'N/A'],
    ['内存得分', deviceDetails.memScore ?? 'N/A'],
    ['静态加权分', deviceDetails.staticWeighted ?? 'N/A'],
    ['动态基准得分', deviceDetails.dynamicScore ?? 'N/A'],

    ['是否熔断', deviceDetails.benchmarkAborted ? '是' : '否'],

    ['熔断原因', deviceDetails.abortReason || '—'],

    ['CPU核心数(中文标签)', deviceDetails.cores_label || ''],
    ['内存(中文标签)', deviceDetails.memory_label || ''],
  ]

  detailRows.forEach(([label, value]) => {
    const row = document.createElement('div')

    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    `

    const labelSpan = document.createElement('span')
    labelSpan.textContent = `${label}:`

    labelSpan.style.cssText = `
      color: #8899aa;
      min-width: 100px;
    `

    const valueSpan = document.createElement('span')
    valueSpan.textContent = value || '—'

    valueSpan.style.cssText = `
      word-break: break-all;
      text-align: right;
      flex: 1;
      margin-left: 10px;
    `

    row.appendChild(labelSpan)
    row.appendChild(valueSpan)

    deviceDetailsList.appendChild(row)
  })

  container.appendChild(deviceDetailsList)

  // =========================
  // 插入页面
  // =========================
  if (!container.isConnected) {
    document.body.appendChild(container)
  }

  return container
}
