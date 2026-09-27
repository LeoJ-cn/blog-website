import './TextLabeling.css'

export type TextLabelingActionData = Record<string, unknown>

export interface TextAnnotation {
  /** 一条标注的稳定标识，用于关联持久化数据和页面中的 wrapper。 */
  id: string
  /** 标注起点在容器 canonical text 中的字符偏移，包含该位置。 */
  startOffset: number
  /** 标注终点在容器 canonical text 中的字符偏移，不包含该位置。 */
  endOffset: number
  /** 创建标注时的原文快照，恢复时用于判断正文是否已经变化。 */
  selectedText: string
  /** 可安全 JSON 序列化的业务扩展数据，不包含函数和 DOM 引用。 */
  actionData?: TextLabelingActionData
}

export interface TextLabelingStyle {
  classNames?: string | string[]
  styles?: Partial<CSSStyleDeclaration>
}

export interface TextLabelingActionConfig extends TextLabelingActionData {
  /** 以下四项由标注器在校验回调执行前写入，调用方不需要手动维护。 */
  currentLabelingStr?: string
  annotationId?: string
  startOffset?: number
  endOffset?: number
  /** 明确指定需要持久化的业务数据；未提供时会从当前配置中过滤可序列化字段。 */
  actionData?: TextLabelingActionData
  labelingStyle?: TextLabelingStyle
  /** 返回 false 时拒绝创建标注，不产生 DOM 或 annotation 记录。 */
  isAddValid?: (actionConfig: TextLabelingActionConfig) => boolean
  /** 返回 false 时保留现有标注，不执行 DOM 解包。 */
  isRemoveValid?: (actionConfig: TextLabelingActionConfig) => boolean
}

export interface TextLabelingCallbacks {
  afterAdd?: (actionConfig: TextLabelingActionConfig, annotation: TextAnnotation) => void
  afterRemove?: (actionConfig: TextLabelingActionConfig, annotation: TextAnnotation) => void
}

export interface TextLabelingConfig {
  container: Node | string
  checkCharacters?: string[]
  exclude?: Node[]
  useMenu?: boolean
  callback?: TextLabelingCallbacks
}

export type RestoreFailureReason =
  // 标注缺少 id、offset 非整数、区间无效或 selectedText 类型错误。
  | 'invalid-annotation'
  // endOffset 超出当前正文 canonical text 的长度。
  | 'out-of-bounds'
  // offset 对应的当前正文内容与保存时的 selectedText 不一致，通常表示原文已变化。
  | 'text-mismatch'
  // 与本次已接受、页面已有的标注区间重叠，或者 annotation id 已存在。
  | 'overlap'
  // 起止位置分属不同文本块；当前单 wrapper 模型不支持跨段落恢复。
  | 'cross-block'
  // offset 无法映射为有效 DOM Range，或者 Range 内容无法安全包装。
  | 'range-unavailable'

export interface RestoreFailure {
  annotation: TextAnnotation
  reason: RestoreFailureReason
}

export interface RestoreResult {
  /** 已通过格式、原文、区间、重叠和同文本块校验并完成 DOM 恢复的标注。 */
  restored: TextAnnotation[]
  /** 未恢复的标注及明确原因；调用方可据此清理或迁移持久化数据。 */
  failed: RestoreFailure[]
}

interface BoundaryPoint {
  node: Text
  offset: number
}

interface InstanceCacheItem {
  node: Node | string
  instance: TextLabeling
}

const LABEL_CLASS = 'tips-area'
const TEXT_CLASS = 'ta-text'
const DELETE_CLASS = 'ta-del-button'
// 当前单 wrapper 模型只允许在这些语义文本块内部标注，不能跨越两个不同块。
const TEXT_BLOCK_SELECTOR =
  'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td, th, dt, dd, figcaption'
const IGNORED_SELECTOR =
  `script, style, .${DELETE_CLASS}, .text-labeling-menu, ` +
  '.text-labeling-box, [data-text-labeling-ignore]'

/**
 * 文本标引核心。
 *
 * 类本身不读写 localStorage。外部可以在 afterAdd/afterRemove 中保存
 * getAnnotations() 的结果，页面刷新后再传给 restoreAnnotations()。
 */
class TextLabeling {
  static instanceCache: InstanceCacheItem[] = []

  private static instanceCount = 0

  readonly config: TextLabelingConfig

  readonly container: Node | null

  currentLabelingStr = ''

  readonly checkCharacters?: string[]

  readonly exclude?: Node[]

  readonly useMenu: boolean

  menuBox: HTMLElement | null = null

  readonly callback: TextLabelingCallbacks

  private readonly annotations = new Map<string, TextAnnotation>()

  private readonly annotationElements = new Map<string, HTMLElement>()

  private readonly elementActionConfigs = new WeakMap<HTMLElement, TextLabelingActionConfig>()

  private isInitialized = false

  private pendingRange: Range | null = null

  // 部分浏览器在弹出右键菜单时会折叠 Selection，因此保留最近一次合法 Range 作为回退。
  private lastValidRange: Range | null = null

  private readonly handleSelectionChange = (): void => {
    const range = this.getCurrentRange()
    if (range && !range.collapsed && this.rangeBelongsToContainer(range)) {
      this.lastValidRange = range.cloneRange()
    }
  }

  private readonly handleContextMenu = (event: Event): void => {
    const mouseEvent = event as MouseEvent
    if (!this.isInContainer()) {
      return
    }

    if (this.useMenu) {
      const currentRange = this.getCurrentRange()
      // 只有右键坐标仍落在原选区内时才复用缓存，避免对已经失效的选择误加标注。
      const activeRange =
        currentRange && !currentRange.collapsed && this.rangeBelongsToContainer(currentRange)
          ? currentRange
          : this.lastValidRange && this.isPointInsideRange(mouseEvent, this.lastValidRange)
            ? this.lastValidRange
            : null
      if (!activeRange) {
        return
      }

      mouseEvent.preventDefault()
      this.pendingRange = activeRange.cloneRange()
      this.setMenu()
      this.displayMenu(mouseEvent)
    }
  }

  private readonly handleContainerClick = (event: Event): void => {
    const target = this.getEventElement(event)
    if (!target) {
      return
    }

    if (target.classList.contains(DELETE_CLASS)) {
      this.removeLabeling(target)
    }
  }

  private readonly handleMenuClick = (event: Event): void => {
    const target = this.getEventElement(event)?.closest('.tlm-add-btn')
    if (!target) {
      return
    }

    if (this.pendingRange && !this.isWithinSameTextBlock(this.pendingRange)) {
      this.pendingRange = null
      this.hideMenu()
      window.alert('暂不支持跨段落标注，请在同一文本块内重新选择。')
      return
    }

    const annotation = this.addLabeling({}, this.pendingRange)
    if (annotation) {
      this.pendingRange = null
      this.lastValidRange = null
      this.hideMenu()
    } else {
      this.pendingRange = null
      window.alert('当前区域已存在标引，请删除后添加！')
    }
  }

  private readonly handleDocumentClick = (event: Event): void => {
    const target = this.getEventElement(event)
    if (!target) {
      return
    }

    if (this.menuBox && !this.menuBox.contains(target)) {
      this.hideMenu()
    }
  }

  constructor(config: TextLabelingConfig) {
    this.config = config
    this.container =
      config.container instanceof Node ? config.container : document.querySelector(config.container)
    this.checkCharacters = config.checkCharacters
    this.exclude = config.exclude
    this.useMenu = Boolean(config.useMenu)
    this.callback = config.callback ?? {}

    TextLabeling.addInstanceToCache(this.container, this)
  }

  /** 预留的旧 API；持久化恢复请使用 restoreAnnotations。 */
  addLabelingDomStructure(): void {}

  getCurrentSelectionContainer(): Node | null {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return null
    }

    const commonAncestor = selection.getRangeAt(0).commonAncestorContainer
    return commonAncestor.nodeType === Node.ELEMENT_NODE
      ? commonAncestor
      : commonAncestor.parentNode
  }

  isChildOf(targetNode: Node | null, fatherNode: Node | null): boolean {
    return Boolean(
      targetNode && fatherNode && (targetNode === fatherNode || fatherNode.contains(targetNode)),
    )
  }

  closeSelection(): void {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return
    }

    selection.getRangeAt(0).collapse()
    selection.removeAllRanges()
  }

  isInContainer(): boolean {
    return this.isChildOf(this.getCurrentSelectionContainer(), this.container)
  }

  bindEvent(): void {
    if (this.isInitialized || !(this.container instanceof Element)) {
      return
    }

    this.container.addEventListener('contextmenu', this.handleContextMenu)
    this.container.addEventListener('click', this.handleContainerClick)
    document.addEventListener('click', this.handleDocumentClick)
    document.addEventListener('selectionchange', this.handleSelectionChange)
    this.isInitialized = true
  }

  rangeIsLegal(): boolean {
    const selection = window.getSelection()
    return Boolean(selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed)
  }

  addApi(actionConfig: TextLabelingActionConfig = {}): TextAnnotation | null {
    if (!this.rangeIsLegal()) {
      return null
    }

    const currentNode = this.getCurrentSelectionContainer()
    const instance = TextLabeling.getInstanceWhereCurrentSelectionIsIn(currentNode, this)
    return instance ? instance.addLabeling(actionConfig) : null
  }

  addLabeling(
    actionConfig: TextLabelingActionConfig = {},
    sourceRange: Range | null = this.getCurrentRange(),
  ): TextAnnotation | null {
    const range = sourceRange
    if (
      !range ||
      !this.rangeBelongsToContainer(range) ||
      !this.isWithinSameTextBlock(range)
    ) {
      return null
    }

    const offsets = this.getRangeOffsets(range)
    if (!offsets || offsets.startOffset === offsets.endOffset) {
      return null
    }

    const selectedText = this.getCanonicalText(range.cloneContents())
    const annotation: TextAnnotation = {
      id: this.createAnnotationId(),
      startOffset: offsets.startOffset,
      endOffset: offsets.endOffset,
      selectedText,
      actionData: this.getSerializableActionData(actionConfig),
    }

    this.enrichActionConfig(actionConfig, annotation)

    if (this.hasOverlap(annotation.startOffset, annotation.endOffset)) {
      return null
    }

    if (actionConfig.isAddValid && !actionConfig.isAddValid(actionConfig)) {
      return null
    }

    const wrapper = this.wrapRange(range, annotation, actionConfig)
    if (!wrapper) {
      return null
    }

    this.currentLabelingStr = selectedText
    this.rememberAnnotation(annotation, wrapper, actionConfig)
    this.callback.afterAdd?.(actionConfig, this.copyAnnotation(annotation))
    return this.copyAnnotation(annotation)
  }

  removeLabeling(currentNode: Element): TextAnnotation | null {
    const wrapper = currentNode.classList.contains(LABEL_CLASS)
      ? currentNode
      : currentNode.closest(`.${LABEL_CLASS}`)

    if (!(wrapper instanceof HTMLElement) || !this.container?.contains(wrapper)) {
      return null
    }

    const annotationId = wrapper.dataset.annotationId
    const annotation = annotationId ? this.annotations.get(annotationId) : undefined
    if (!annotation) {
      return null
    }

    const actionConfig = this.elementActionConfigs.get(wrapper) ?? {}
    this.enrichActionConfig(actionConfig, annotation)

    if (actionConfig.isRemoveValid && !actionConfig.isRemoveValid(actionConfig)) {
      return null
    }

    const textBox = wrapper.querySelector(`:scope > .${TEXT_CLASS}`)
    if (!textBox || !wrapper.parentNode) {
      return null
    }

    while (textBox.firstChild) {
      wrapper.parentNode.insertBefore(textBox.firstChild, wrapper)
    }
    wrapper.remove()

    this.annotations.delete(annotation.id)
    this.annotationElements.delete(annotation.id)
    this.currentLabelingStr = annotation.selectedText
    this.callback.afterRemove?.(actionConfig, this.copyAnnotation(annotation))
    return this.copyAnnotation(annotation)
  }

  /** 返回可用于 JSON/localStorage 的标注快照。 */
  getAnnotations(): TextAnnotation[] {
    return [...this.annotations.values()]
      .sort((left, right) => left.startOffset - right.startOffset)
      .map((annotation) => this.copyAnnotation(annotation))
  }

  clearAnnotations(): TextAnnotation[] {
    const removed: TextAnnotation[] = []
    const wrappers = [...this.annotationElements.values()]

    for (const wrapper of wrappers) {
      const annotation = this.removeLabeling(wrapper)
      if (annotation) {
        removed.push(annotation)
      }
    }

    return removed
  }

  /**
   * 根据全局文本 offset 恢复标注。恢复不触发 afterAdd，避免重复持久化。
   */
  restoreAnnotations(input: readonly TextAnnotation[]): RestoreResult {
    const result: RestoreResult = { restored: [], failed: [] }
    if (!this.container) {
      for (const annotation of input) {
        result.failed.push({
          annotation: this.copyAnnotation(annotation),
          reason: 'range-unavailable',
        })
      }
      return result
    }

    const sourceText = this.getCanonicalText(this.container)
    const accepted: TextAnnotation[] = []

    for (const rawAnnotation of input) {
      const annotation = this.copyAnnotation(rawAnnotation)
      const failureReason = this.validateRestoredAnnotation(annotation, sourceText, accepted)
      if (failureReason) {
        result.failed.push({ annotation, reason: failureReason })
      } else {
        accepted.push(annotation)
      }
    }

    // 从后向前改写 DOM，避免前面的包装节点改变后续 offset 对应的文本边界。
    accepted
      .sort((left, right) => right.startOffset - left.startOffset)
      .forEach((annotation) => {
        const range = this.createRangeFromOffsets(annotation.startOffset, annotation.endOffset)
        if (!range) {
          result.failed.push({ annotation, reason: 'range-unavailable' })
          return
        }

        if (!this.isWithinSameTextBlock(range)) {
          result.failed.push({ annotation, reason: 'cross-block' })
          return
        }

        const actionConfig: TextLabelingActionConfig = {
          ...(annotation.actionData ?? {}),
        }
        this.enrichActionConfig(actionConfig, annotation)
        const wrapper = this.wrapRange(range, annotation, actionConfig)
        if (!wrapper) {
          result.failed.push({ annotation, reason: 'range-unavailable' })
          return
        }

        this.rememberAnnotation(annotation, wrapper, actionConfig)
        result.restored.push(this.copyAnnotation(annotation))
      })

    result.restored.sort((left, right) => left.startOffset - right.startOffset)
    return result
  }

  isAllowAdditions(sourceRange: Range | null = this.getCurrentRange()): boolean {
    const range = sourceRange
    if (
      !range ||
      !this.rangeBelongsToContainer(range) ||
      !this.isWithinSameTextBlock(range)
    ) {
      return false
    }

    const offsets = this.getRangeOffsets(range)
    return Boolean(
      offsets &&
        offsets.startOffset !== offsets.endOffset &&
        !this.hasOverlap(offsets.startOffset, offsets.endOffset),
    )
  }

  setMenu(): void {
    let menuBox = document.querySelector<HTMLElement>('.text-labeling-box')
    if (!menuBox) {
      menuBox = document.createElement('div')
      menuBox.className = 'text-labeling-box'
      document.body.appendChild(menuBox)
    }

    menuBox.innerHTML =
      '<div class="text-labeling-menu"><button class="tlm-add-btn">Add Labeling</button></div>'
    const addButton = menuBox.querySelector<HTMLButtonElement>('.tlm-add-btn')
    if (addButton) {
      addButton.onclick = this.handleMenuClick
    }
    this.menuBox = menuBox
  }

  hideMenu(): void {
    if (this.menuBox) {
      this.menuBox.style.display = 'none'
    }
  }

  displayMenu(event: MouseEvent): void {
    if (!this.menuBox) {
      return
    }

    this.menuBox.style.display = 'block'
    this.menuBox.style.left = `${event.clientX + 30}px`
    this.menuBox.style.top = `${event.clientY - 10}px`
  }

  loadCss(): void {}

  destroy(): void {
    if (this.container instanceof Element && this.isInitialized) {
      this.container.removeEventListener('contextmenu', this.handleContextMenu)
      this.container.removeEventListener('click', this.handleContainerClick)
      document.removeEventListener('click', this.handleDocumentClick)
      document.removeEventListener('selectionchange', this.handleSelectionChange)
      const addButton = this.menuBox?.querySelector<HTMLButtonElement>('.tlm-add-btn')
      if (addButton) {
        addButton.onclick = null
      }
    }

    this.isInitialized = false
    this.pendingRange = null
    this.lastValidRange = null
    TextLabeling.removeInstanceFromCache(this.container)
  }

  init(): void {
    this.bindEvent()
  }

  static getInstanceIndex(node: Node | null): number {
    return this.instanceCache.findIndex((item) => item.node === node)
  }

  static addInstanceToCache(node: Node | null, instance: TextLabeling): void {
    const cacheNode: Node | string = node ?? `GetCommonApi${this.instanceCount++}`
    const index = node ? this.getInstanceIndex(node) : -1

    if (index === -1) {
      this.instanceCache.push({ node: cacheNode, instance })
    } else {
      this.instanceCache[index].instance = instance
    }
  }

  static removeInstanceFromCache(node: Node | null): void {
    const index = this.getInstanceIndex(node)
    if (index !== -1) {
      this.instanceCache.splice(index, 1)
    }
  }

  static getInstanceWhereCurrentSelectionIsIn(
    node: Node | null,
    scope: TextLabeling,
  ): TextLabeling | undefined {
    let instance: TextLabeling | undefined
    for (const item of this.instanceCache) {
      if (item.node instanceof Node && scope.isChildOf(node, item.node)) {
        instance = item.instance
      }
    }
    return instance
  }

  private getCurrentRange(): Range | null {
    const selection = window.getSelection()
    return selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  }

  private getEventElement(event: Event): Element | null {
    if (event.target instanceof Element) {
      return event.target
    }
    return event.target instanceof Node ? event.target.parentElement : null
  }

  private isPointInsideRange(event: MouseEvent, range: Range): boolean {
    return [...range.getClientRects()].some(
      (rect) =>
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom,
    )
  }

  private rangeBelongsToContainer(range: Range): boolean {
    return Boolean(
      this.container &&
        this.isChildOf(range.startContainer, this.container) &&
        this.isChildOf(range.endContainer, this.container),
    )
  }

  private getTextBlock(node: Node): Element | null {
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
    return element?.closest(TEXT_BLOCK_SELECTOR) ?? null
  }

  private isWithinSameTextBlock(range: Range): boolean {
    const startBlock = this.getTextBlock(range.startContainer)
    const endBlock = this.getTextBlock(range.endContainer)

    // 一条 annotation 仍只对应一个行内 wrapper；跨块选择必须在修改 DOM 前拒绝。
    return Boolean(
      startBlock &&
        startBlock === endBlock &&
        this.container?.contains(startBlock),
    )
  }

  private getRangeOffsets(range: Range): { startOffset: number; endOffset: number } | null {
    if (!this.container || !this.rangeBelongsToContainer(range)) {
      return null
    }

    // offset 统一以容器的 canonical text 为坐标系，避免依赖易受 DOM 包装影响的节点路径。
    const beforeStart = document.createRange()
    beforeStart.selectNodeContents(this.container)
    beforeStart.setEnd(range.startContainer, range.startOffset)

    const beforeEnd = document.createRange()
    beforeEnd.selectNodeContents(this.container)
    beforeEnd.setEnd(range.endContainer, range.endOffset)

    return {
      startOffset: this.getCanonicalText(beforeStart.cloneContents()).length,
      endOffset: this.getCanonicalText(beforeEnd.cloneContents()).length,
    }
  }

  private getCanonicalText(root: Node): string {
    if (root.nodeType === Node.TEXT_NODE) {
      return this.isIgnoredTextNode(root as Text) ? '' : (root.nodeValue ?? '')
    }

    // 标注删除按钮和菜单属于交互 UI，不是原文；排除它们才能保证增删标注前后的 offset 稳定。
    const ownerDocument = root.ownerDocument ?? document
    const walker = ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        this.isIgnoredTextNode(node as Text) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    })
    let text = ''
    let currentNode = walker.nextNode()
    while (currentNode) {
      text += currentNode.nodeValue ?? ''
      currentNode = walker.nextNode()
    }
    return text
  }

  private isIgnoredTextNode(node: Text): boolean {
    const parent = node.parentElement
    if (!parent) {
      return false
    }

    if (parent.closest(IGNORED_SELECTOR)) {
      return true
    }

    return Boolean(this.exclude?.some((excludedNode) => excludedNode.contains(node)))
  }

  private createRangeFromOffsets(startOffset: number, endOffset: number): Range | null {
    if (!this.container) {
      return null
    }

    const start = this.findBoundaryPoint(startOffset)
    const end = this.findBoundaryPoint(endOffset)
    if (!start || !end) {
      return null
    }

    const range = document.createRange()
    range.setStart(start.node, start.offset)
    range.setEnd(end.node, end.offset)
    return range
  }

  private findBoundaryPoint(globalOffset: number): BoundaryPoint | null {
    if (!this.container || globalOffset < 0) {
      return null
    }

    const ownerDocument = this.container.ownerDocument ?? document
    const walker = ownerDocument.createTreeWalker(this.container, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        this.isIgnoredTextNode(node as Text) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    })

    // 按与 getCanonicalText 完全相同的遍历规则累计字符数，将全局 offset 还原为 DOM 边界。
    let consumed = 0
    let lastTextNode: Text | null = null
    let currentNode = walker.nextNode()
    while (currentNode) {
      const textNode = currentNode as Text
      const length = textNode.data.length
      if (globalOffset <= consumed + length) {
        return { node: textNode, offset: globalOffset - consumed }
      }
      consumed += length
      lastTextNode = textNode
      currentNode = walker.nextNode()
    }

    return globalOffset === consumed && lastTextNode
      ? { node: lastTextNode, offset: lastTextNode.data.length }
      : null
  }

  private wrapRange(
    range: Range,
    annotation: TextAnnotation,
    actionConfig: TextLabelingActionConfig,
  ): HTMLElement | null {
    try {
      const fragment = range.extractContents()
      const wrapper = document.createElement('span')
      const textBox = document.createElement('span')
      const deleteButton = document.createElement('span')

      wrapper.classList.add(LABEL_CLASS)
      wrapper.dataset.annotationId = annotation.id
      textBox.classList.add(TEXT_CLASS)
      deleteButton.classList.add(DELETE_CLASS)
      deleteButton.textContent = 'x'
      textBox.appendChild(fragment)
      wrapper.append(textBox, deleteButton)
      this.applyLabelingStyle(wrapper, actionConfig.labelingStyle)
      range.insertNode(wrapper)
      range.collapse(false)
      return wrapper
    } catch {
      return null
    }
  }

  private applyLabelingStyle(wrapper: HTMLElement, labelingStyle?: TextLabelingStyle): void {
    if (!labelingStyle) {
      return
    }

    const classNames = Array.isArray(labelingStyle.classNames)
      ? labelingStyle.classNames
      : labelingStyle.classNames?.split(/\s+/)
    classNames?.filter(Boolean).forEach((className) => wrapper.classList.add(className))

    if (labelingStyle.styles) {
      Object.assign(wrapper.style, labelingStyle.styles)
    }
  }

  private rememberAnnotation(
    annotation: TextAnnotation,
    wrapper: HTMLElement,
    actionConfig: TextLabelingActionConfig,
  ): void {
    this.annotations.set(annotation.id, this.copyAnnotation(annotation))
    this.annotationElements.set(annotation.id, wrapper)
    this.elementActionConfigs.set(wrapper, actionConfig)
  }

  private hasOverlap(startOffset: number, endOffset: number): boolean {
    // 使用半开区间 [start, end)：首尾相接允许，任意实际交集都禁止。
    for (const annotation of this.annotations.values()) {
      if (startOffset < annotation.endOffset && endOffset > annotation.startOffset) {
        return true
      }
    }
    return false
  }

  private validateRestoredAnnotation(
    annotation: TextAnnotation,
    sourceText: string,
    accepted: readonly TextAnnotation[],
  ): RestoreFailureReason | null {
    if (
      !annotation.id ||
      !Number.isInteger(annotation.startOffset) ||
      !Number.isInteger(annotation.endOffset) ||
      annotation.startOffset < 0 ||
      annotation.endOffset <= annotation.startOffset ||
      typeof annotation.selectedText !== 'string'
    ) {
      return 'invalid-annotation'
    }

    if (annotation.endOffset > sourceText.length) {
      return 'out-of-bounds'
    }

    // selectedText 是 offset 之外的内容校验，原文变化后不应把旧位置静默套到新文本上。
    if (
      sourceText.slice(annotation.startOffset, annotation.endOffset) !== annotation.selectedText
    ) {
      return 'text-mismatch'
    }

    const overlapsAccepted = accepted.some(
      (item) => annotation.startOffset < item.endOffset && annotation.endOffset > item.startOffset,
    )
    if (
      overlapsAccepted ||
      this.annotations.has(annotation.id) ||
      this.hasOverlap(annotation.startOffset, annotation.endOffset)
    ) {
      return 'overlap'
    }

    return null
  }

  private enrichActionConfig(
    actionConfig: TextLabelingActionConfig,
    annotation: TextAnnotation,
  ): void {
    actionConfig.currentLabelingStr = annotation.selectedText
    actionConfig.annotationId = annotation.id
    actionConfig.startOffset = annotation.startOffset
    actionConfig.endOffset = annotation.endOffset
  }

  private getSerializableActionData(
    actionConfig: TextLabelingActionConfig,
  ): TextLabelingActionData | undefined {
    // 回调函数、DOM 引用和运行时派生字段不可安全持久化，只保留 JSON 可表达的业务数据。
    const source = actionConfig.actionData ?? actionConfig
    const seen = new WeakSet<object>()

    try {
      const json = JSON.stringify(source, (key, value: unknown) => {
        if (
          key === 'currentLabelingStr' ||
          key === 'annotationId' ||
          key === 'startOffset' ||
          key === 'endOffset' ||
          key === 'labelingStyle' ||
          key === 'isAddValid' ||
          key === 'isRemoveValid' ||
          key === 'actionData'
        ) {
          return undefined
        }
        if (typeof value === 'function' || typeof value === 'symbol') {
          return undefined
        }
        if (typeof value === 'bigint') {
          return value.toString()
        }
        if (value instanceof Node || value === window) {
          return undefined
        }
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return undefined
          }
          seen.add(value)
        }
        return value
      })
      return json ? (JSON.parse(json) as TextLabelingActionData) : undefined
    } catch {
      return undefined
    }
  }

  private copyAnnotation(annotation: TextAnnotation): TextAnnotation {
    return {
      id: annotation.id,
      startOffset: annotation.startOffset,
      endOffset: annotation.endOffset,
      selectedText: annotation.selectedText,
      actionData: annotation.actionData ? { ...annotation.actionData } : undefined,
    }
  }

  private createAnnotationId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }

    return `text-label-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

export default TextLabeling
