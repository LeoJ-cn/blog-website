# 方案二：升级账号后读取 `549:8646`

账号升级并配置最小权限 OAuth 或 Personal Access Token 后，优先按节点读取：

```http
GET https://api.figma.com/v1/files/nNucEWzFynloGtIBf1B0Bc/nodes?ids=549:8646
```

如需补充完整 Variables 关系，再按届时官方文档和账号 Scope 调用文件 Variables 接口。

建议输出目录：

```text
packages/ui/figma/test/rest-api/
├── node-549-8646.json
├── variables-local.json
├── normalized-layout.json
├── normalized-styles.json
└── fetch-manifest.json
```

安全要求：

- Token、OAuth refresh token、Cookie 和邮箱不得写入仓库；
- 只授予读取该文件所需的最小 Scope；
- `fetch-manifest.json` 记录请求时间、HTTP 状态、响应字节数和是否截断；
- 不使用 `GET /v1/files/:file_key` 导出其他 Page，除非未来明确需要；
- 首选 `/nodes?ids=549:8646`，将范围限制在当前目标。

当前没有创建 Token、调用 REST API、安装 SDK 或写入任何凭据。
