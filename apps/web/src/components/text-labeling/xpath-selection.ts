export interface XPathSelectionSnapshot {
  /** 起点节点相对于演示容器的 XPath。`.` 表示容器自身。 */
  startXPath: string
  /** 起点在 Text.data 或 Element.childNodes 中的零基偏移。 */
  startOffset: number
  /** 终点节点相对于演示容器的 XPath。`.` 表示容器自身。 */
  endXPath: string
  /** 终点在 Text.data 或 Element.childNodes 中的零基偏移。 */
  endOffset: number
  /** 保存时的选中文本，仅用于展示并帮助判断 DOM 是否已经变化。 */
  selectedText: string
}

function isNodeInsideContainer(node: Node, container: HTMLElement): boolean {
  return node === container || container.contains(node)
}

function getNodeXPath(node: Node, container: HTMLElement): string {
  if (node === container) return '.'

  const parent = node.parentNode
  if (!parent || !isNodeInsideContainer(parent, container)) {
    throw new Error('选区节点不在 XPath 演示正文中。')
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const textNodes = Array.from(parent.childNodes).filter(
      (sibling) => sibling.nodeType === Node.TEXT_NODE,
    )
    const index = textNodes.indexOf(node) + 1
    const suffix = textNodes.length === 1 ? '' : `[${index}]`
    return `${getNodeXPath(parent, container)}/text()${suffix}`
  }

  if (!(node instanceof Element)) {
    throw new Error('当前选区包含暂不支持的 DOM 节点。')
  }

  const siblings = Array.from(parent.childNodes).filter(
    (sibling): sibling is Element =>
      sibling.nodeType === Node.ELEMENT_NODE &&
      (sibling as Element).tagName === node.tagName,
  )
  const index = siblings.indexOf(node) + 1
  const suffix = siblings.length === 1 ? '' : `[${index}]`

  return `${getNodeXPath(parent, container)}/${node.tagName.toLowerCase()}${suffix}`
}

function getNodeByXPath(xpath: string, container: HTMLElement): Node | null {
  const result = container.ownerDocument.evaluate(
    xpath,
    container,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  )
  return result.singleNodeValue
}

function isValidBoundaryOffset(node: Node, offset: number): boolean {
  if (!Number.isInteger(offset) || offset < 0) return false
  if (node.nodeType === Node.TEXT_NODE) return offset <= (node.textContent?.length ?? 0)
  return offset <= node.childNodes.length
}

export function captureXPathSelection(container: HTMLElement): XPathSelectionSnapshot {
  const selection = container.ownerDocument.defaultView?.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    throw new Error('请先在 XPath 演示正文中选择一段文字。')
  }

  const range = selection.getRangeAt(0)
  if (
    !isNodeInsideContainer(range.startContainer, container) ||
    !isNodeInsideContainer(range.endContainer, container)
  ) {
    throw new Error('选区必须完整位于 XPath 演示正文中。')
  }

  return {
    startXPath: getNodeXPath(range.startContainer, container),
    startOffset: range.startOffset,
    endXPath: getNodeXPath(range.endContainer, container),
    endOffset: range.endOffset,
    selectedText: range.toString(),
  }
}

export function restoreXPathSelection(
  container: HTMLElement,
  snapshot: XPathSelectionSnapshot,
): void {
  const startNode = getNodeByXPath(snapshot.startXPath, container)
  const endNode = getNodeByXPath(snapshot.endXPath, container)

  if (!startNode || !endNode) {
    throw new Error('XPath 对应的节点已经不存在，无法恢复选区。')
  }
  if (
    !isValidBoundaryOffset(startNode, snapshot.startOffset) ||
    !isValidBoundaryOffset(endNode, snapshot.endOffset)
  ) {
    throw new Error('保存的 offset 已超出当前节点边界，无法恢复选区。')
  }

  const range = container.ownerDocument.createRange()
  range.setStart(startNode, snapshot.startOffset)
  range.setEnd(endNode, snapshot.endOffset)

  const selection = container.ownerDocument.defaultView?.getSelection()
  if (!selection) {
    throw new Error('当前浏览器不支持 Selection API。')
  }

  selection.removeAllRanges()
  selection.addRange(range)
}
