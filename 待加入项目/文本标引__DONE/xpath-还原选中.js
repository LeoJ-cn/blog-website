// const container = document.querySelector(".mw-body-content");
const container = document

var range
var startXPath
var endXPath
var startOffset
var endOffset
var test = {}

function getXPath(node) {
  if (node === container) return '' // 到达容器层，停止递归

  // 处理文本节点
  if (node.nodeType === Node.TEXT_NODE) {
    // 过滤合法的兄弟元素节点
    const txtList = Array.from(node.parentNode.childNodes).filter(
      (sibling) => sibling.nodeType === Node.TEXT_NODE,
    )
    const tIndex = txtList.indexOf(node) + 1 // XPath 索引以 1 开始
    const txtXEnd = txtList.length === 1 ? '' : `[${tIndex}]`
    return getXPath(node.parentNode) + `/text()${txtXEnd}`
  }

  // 过滤合法的兄弟元素节点
  const siblings = Array.from(node.parentNode.children).filter(
    (sibling) => sibling.tagName === node.tagName,
  )

  const index = siblings.indexOf(node) + 1 // XPath 索引以 1 开始
  const xEnd = siblings.length === 1 ? '' : `[${index}]`

  return getXPath(node.parentNode) + `/${node.tagName.toLowerCase()}${xEnd}`
}

function calulX() {
  // localStorage.setItem('zm-range', a)
  // var range = JSON.parse(localStorage.getItem('zm-range'));
  // var range = a;
  range = window.getSelection().getRangeAt(0)
  startXPath = getXPath(range.startContainer)
  endXPath = getXPath(range.endContainer)
  startOffset = range.startOffset
  endOffset = range.endOffset

  test = {
    startXPath,
    startOffset,
    endXPath,
    endOffset,
    __range: range,
  }

  console.log(test)
}

function getNodeByXPath(xpath) {
  const result = document.evaluate(
    xpath, // 1. 要查询的 XPath 表达式
    container, // 2. 查询范围的上下文节点
    null, // 3. 自定义命名空间（此处未使用）
    XPathResult.FIRST_ORDERED_NODE_TYPE, // 4. 返回的结果类型：第一个匹配的节点
    null, // 5. 结果集的起始节点（通常为 null）
  )
  return result.singleNodeValue
}

function restoreHighlights() {
  const highlights = [test]
  highlights.forEach((hl) => {
    const startNode = getNodeByXPath(hl.startXPath)
    const endNode = getNodeByXPath(hl.endXPath)

    if (!container || !startNode || !endNode) return

    // 恢复标注
    const range = document.createRange()
    range.setStart(startNode, hl.startOffset)
    range.setEnd(endNode, hl.endOffset)

    // 将 Range 添加到 Selection 中以触发选中
    const selection = window.getSelection()
    selection.removeAllRanges() // 清空当前选区（防止多选存在）
    selection.addRange(range) // 添加新的范围
    // addLabeling({
    //   comment: hl.comment,
    //   labelingStyle: { styles: {}, classNames: "highlighted" },
    // });
  })
}

const btn = document.createElement('button')
btn.style.padding = '10px'
btn.style.backgroundColor = '#4CAF50'
btn.style.color = 'white'
btn.style.position = 'fixed'
btn.style.top = '10px'
btn.style.right = '10px'
btn.style.fontSize = '56px'
btn.innerText = '恢复高亮222'
btn.addEventListener('mouseenter', () => {
  btn.style.cursor = 'pointer'
})

btn.addEventListener('mouseleave', () => {
  btn.style.cursor = 'default'
})
btn.addEventListener('click', restoreHighlights)
document.body.appendChild(btn)

const btn2 = document.createElement('button')
btn2.style.margin = '20px'
btn2.innerText = '计算'
btn2.style.position = 'fixed'
btn2.style.top = '150px'
btn2.style.right = '20px'
btn.style.padding = '30px'
btn2.style.backgroundColor = 'red'
btn2.addEventListener('click', calulX)
document.body.appendChild(btn2)
