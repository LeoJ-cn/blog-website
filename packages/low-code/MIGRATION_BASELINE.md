# Logic Editor 迁移基线

## 源目录

```text
/Users/leojm5/Documents/company/yuerwang/yuer-bug_副本/
repo_13a3fd5c84e946508021e607cfa4afdf/
packages/gui/components/logic-editor
```

基线统计：共 190 个文件，约 1.2 MB。

| 区域 | 文件数 |
| --- | ---: |
| 根目录 | 6 |
| `const` | 1 |
| `graph` | 120 |
| `handler` | 9 |
| `interface` | 1 |
| `node-config` | 3 |
| `operation` | 2 |
| `service` | 46 |
| `styles` | 2 |

静态资源包括 55 个 SVG 和 7 个 PNG。`.DS_Store` 不迁移。

## Vue 2 TSX 组件

```text
FrontLogicEditor.tsx
LogicEditorLeftBar.tsx
LogicEditorRightBar.tsx
LogicEditorStage.tsx
LogicServiceListManage.tsx
node-config/BaseNodeConfig.tsx
node-config/MethodNodeConfig.tsx
node-config/VariableNodeConfig.tsx
operation/LogicOperationEditor.tsx
operation/LogicOperationItem.tsx
```

## G6 节点文件

```text
logic-addition-node.ts
logic-and-node.ts
logic-api-node.ts
logic-array-foreach-node.ts
logic-assign-node.ts
logic-base-node.ts
logic-calc-node.ts
logic-create-object-node.ts
logic-division-node.ts
logic-end-node.ts
logic-equal-node.ts
logic-func-node.ts
logic-get-locale-node.ts
logic-greater-equal-node.ts
logic-greater-node.ts
logic-ifelse-node.ts
logic-less-equal-node.ts
logic-less-node.ts
logic-lifecycle-node.ts
logic-message-node.ts
logic-method-ref-node.ts
logic-multiplication-node.ts
logic-negation-node.ts
logic-net-node.ts
logic-next-tick-node.ts
logic-not-equal-node.ts
logic-or-node.ts
logic-page-pass-value-node.ts
logic-remainder-node.ts
logic-router-node.ts
logic-set-array-item-node.ts
logic-set-locale-node.ts
logic-side-message-node.ts
logic-start-node.ts
logic-substraction-node.ts
logic-try-catch-node.ts
logic-variable-detail-node.ts
logic-variable-node.ts
test.ts
```

`test.ts` 被生产组件 `LogicEditorStage.tsx` 导入，迁移时按生产依赖处理，不作为测试代码。

## 节点注册键

旧 `graph/shape/register-nodes.ts` 注册以下节点工厂，并通过 `VARIABLE_TYPES` 循环注册变量节点：

```text
LOGIC_BASE_NODE
LOGIC_START_NODE
LOGIC_END_NODE
LOGIC_NET_NODE
LOGIC_LIFECYCLE_NODE
LOGIC_FUNC_NODE
LOGIC_API_NODE
LOGIC_VARIABLE_DETAIL_NODE
LOGIC_CREATE_OBJECT_NODE
LOGIC_ASSIGN_NODE
LOGIC_ARRAY_FOREACH_NODE
LOGIC_SET_ARRAY_ITEM_NODE
LOGIC_TRY_CATCH_NODE
LOGIC_IFELSE_NODE
LOGIC_MESSAGE_NODE
LOGIC_ROUTER_NODE
LOGIC_CALC_NODE
LOGIC_EQUAL_NODE
LOGIC_NOT_EQUAL_NODE
LOGIC_LESS_NODE
LOGIC_GREATER_NODE
LOGIC_LESS_EQUAL_NODE
LOGIC_GREATER_EQUAL_NODE
LOGIC_NEGATION_NODE
LOGIC_AND_NODE
LOGIC_OR_NODE
LOGIC_ADDITION_NODE
LOGIC_SUBTRACTION_NODE
LOGIC_MULTIPLICATION_NODE
LOGIC_DIVISION_NODE
LOGIC_REMAINDER_NODE
LOGIC_SIDE_MESSAGE_NODE
LOGIC_PAGE_PASS_VALUE_NODE
LOGIC_GET_LOCALE_NODE
LOGIC_SET_LOCALE_NODE
LOGIC_METHOD_REF_NODE
LOGIC_NEXT_TICK_NODE
VARIABLE_TYPES
```

## G6 边文件

```text
logic-statement-edge.ts
logic-variable-edge.ts
```

## G6 behavior 文件

```text
active-edge.ts
anchor-event.ts
canvas-event.ts
delete-item.ts
drag-node.ts
hover-node.ts
index.ts
item-event.ts
scroll-container.ts
select-node.ts
```

## 配置构建器

```text
api-config-service.ts
base-config-service.ts
interface/index.ts
lifecycle-config-service.ts
method-config-service.ts
node-config-services-factory.ts
variable-config-service.ts
variable-detial-config-service.ts
```

## 翻译器文件

```text
16-block_add_array_item.ts
17-block_delete_array_item.ts
18-block_get_array_item.ts
19-array-concat.ts
20-block_array_length.ts
21-设置临时对象.ts
22-block_change_array_item.ts
23-数字转字符串.ts
24-保留n位小数.ts
25-向上取整.ts
26-向下取整.ts
27-字符串转数字.ts
28-分割字符串.ts
29-截取字符串.ts
30-字符串匹配.ts
BaseService.ts
TranslateAndOrNodeService.ts
TranslateApiNodeService.ts
TranslateArrayForeachNodeService.ts
TranslateAssignNodeService.ts
TranslateCreateObjectNodeService.ts
TranslateEndNodeService.ts
TranslateFunctionNodeService.ts
TranslateGetLocaleService.ts
TranslateIfelseNodeService.ts
TranslateMathArithmeticBasicService.ts
TranslateMathCompareNodeService.ts
TranslateMessageNodeService.ts
TranslateMethodRefService.ts
TranslateNegationNodeService.ts
TranslateNetNodeNodeService.ts
TranslateNextTickService.ts
TranslatePagePassValueService.ts
TranslateRouterLinkNodeService.ts
TranslateSetArrayItemNode.ts
TranslateSetLocaleService.ts
TranslateSideMessageService.ts
TranslateStartNodeService.ts
TranslateTryCatchService.ts
index.ts
```

## 翻译器注册键

旧 `service/translate-new/index.ts` 注册以下 `BlockNames_DTS`：

```text
LOGIC_START_NODE
LOGIC_END_NODE
LOGIC_TRY_CATCH_NODE
LOGIC_FUNC_NODE
LOGIC_MESSAGE_NODE
LOGIC_ARRAY_FOREACH_NODE
LOGIC_IFELSE_NODE
LOGIC_ASSIGN_NODE
LOGIC_NEGATION_NODE
LOGIC_AND_NODE
LOGIC_OR_NODE
LOGIC_EQUAL_NODE
LOGIC_NOT_EQUAL_NODE
LOGIC_GREATER_NODE
LOGIC_GREATER_EQUAL_NODE
LOGIC_LESS_NODE
LOGIC_LESS_EQUAL_NODE
LOGIC_NET_NODE
LOGIC_ROUTER_NODE
LOGIC_ADDITION_NODE
LOGIC_SUBTRACTION_NODE
LOGIC_MULTIPLICATION_NODE
LOGIC_DIVISION_NODE
LOGIC_REMAINDER_NODE
LOGIC_SIDE_MESSAGE_NODE
LOGIC_PAGE_PASS_VALUE_NODE
LOGIC_GET_LOCALE_NODE
LOGIC_NEXT_TICK_NODE
LOGIC_SET_LOCALE_NODE
LOGIC_METHOD_REF_NODE
LOGIC_API_NODE
LOGIC_CREATE_OBJECT_NODE
LOGIC_SET_ARRAY_ITEM_NODE
```

编号翻译文件 `16-` 至 `30-` 当前未全部进入主注册表。迁移必须保持其当前注册状态，不主动启用或删除。

## 样式

```text
styles/graph.module.less
styles/logic-editor.module.less
```

## 后续对照记录

后续任务须在本文件追加：目录外 import 分类、旧新组件方法映射、节点与翻译器注册对照、资源路径对照以及兼容性差异。
