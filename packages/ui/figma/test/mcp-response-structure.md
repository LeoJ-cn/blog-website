# MCP 响应结构

## 1. 外层响应

本次观察到的通用结构：

```ts
type CallToolResult = {
  content: ContentBlock[]
  structuredContent?: Record<string, unknown>
  isError?: boolean
}
```

例如，`get_screenshot` 虽然返回 JSON 数据，但 JSON 位于文本块的 `text` 字符串中：

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"image_url\":\"...\",\"width\":1024,\"height\":729}"
    }
  ],
  "isError": false
}
```

调用方需要再对 `content[0].text` 执行 JSON 解析。

## 2. 本次观察到的 Content Block

### TextContent

```ts
type TextContent = {
  type: "text"
  text: string
}
```

`text` 可能承载：

- XML-like 节点树：`get_metadata`；
- JSON 字符串：`get_screenshot`、`get_variable_defs`；
- React/TSX 代码：`get_design_context`；
- 普通说明或错误文本。

### ImageContent

```ts
type ImageContent = {
  type: "image"
  data: string
  mimeType: string
}
```

本次 `get_design_context` 的子节点调用返回了 `image/png`，其中 `data` 是 Base64 字符串。

## 3. structuredContent

`structuredContent` 不是每个工具都会返回。本次 `whoami` 同时提供了文本内容和结构化内容，但 `get_metadata`、`get_screenshot` 等核心设计读取工具没有提供该字段。

## 4. isError 的语义

`isError=false` 只表示 MCP 工具调用没有被工具层判定为错误，不保证业务操作成功。例如 Code Connect 权限不足时，本次响应仍然是：

```json
{
  "content": [
    {
      "type": "text",
      "text": "You need a Dev or Full seat ..."
    }
  ],
  "isError": false
}
```

因此调用方还需要检查文本或结构化状态，不能只判断 `isError`。

## 5. 数据处理链

```text
MCP CallToolResult
  └── content[]
      ├── text → JSON.parse / XML-like parser / code text
      └── image → Base64 decode according to mimeType
```
