import type { UiComponentSlug } from '@white55/ui/catalog'

export interface UiDocEntry {
  slug: UiComponentSlug
  title: string
  summary: string
  guidance: string
  accessibility: string
  themeTokens: string[]
  imports: string
  api: string[]
  usage: string
}

export const uiDocs: UiDocEntry[] = [
  {
    slug: 'button', title: 'Button 按钮',
    summary: '用于触发操作，统一主次操作、禁用和加载状态。',
    guidance: '一个操作区通常只放一个主按钮；危险操作应使用明确文案。',
    accessibility: '仅图标按钮需提供可读名称；加载时避免重复提交。',
    themeTokens: ['--ui-action', '--ui-danger', '--ui-focus', '--ui-radius-control'],
    imports: 'UiButton',
    api: ['type', 'size', 'disabled', 'loading', 'nativeType', 'default/icon/loading slots'],
    usage: '<UiButton type="primary">保存</UiButton>',
  },
  {
    slug: 'input', title: 'Input 输入框',
    summary: '用于录入短文本，支持双向绑定与前后缀内容。',
    guidance: '需要多行内容时使用 Element Plus 对应的 textarea 类型；不要把 placeholder 当作标签。',
    accessibility: '为输入框关联可见 label；错误文案由表单项提供。',
    themeTokens: ['--ui-border', '--ui-focus', '--ui-radius-control'],
    imports: 'UiInput',
    api: ['v-model', 'placeholder', 'disabled', 'clearable', 'type', 'prefix/suffix/prepend/append slots'],
    usage: '<UiInput v-model="name" placeholder="请输入名称" />',
  },
  {
    slug: 'dialog', title: 'Dialog 对话框',
    summary: '用于需要用户明确处理的浮层内容。默认不允许点击遮罩关闭。',
    guidance: '短任务使用对话框；复杂流程应转为独立页面。',
    accessibility: '提供标题，确保关闭按钮与键盘焦点可用；弹层主题同步到根节点。',
    themeTokens: ['--ui-surface', '--ui-text', '--ui-radius-panel'],
    imports: 'UiDialog',
    api: ['v-model', 'title', 'width', 'closeOnClickModal', 'header/footer slots'],
    usage: '<UiDialog v-model="visible" title="确认操作">内容</UiDialog>',
  },
  {
    slug: 'loading', title: 'Loading 加载状态',
    summary: '用于局部异步等待；状态文案会提供给辅助技术。',
    guidance: '当前版本提供行内状态；全屏遮罩与指令式加载不属于本组件 API。',
    accessibility: '提供描述当前任务的 label；不要只用转圈动画表达状态。',
    themeTokens: ['--ui-action', '--ui-text-muted', '--ui-icon-size'],
    imports: 'UiLoading', api: ['label'],
    usage: '<UiLoading label="正在加载数据" />',
  },
  {
    slug: 'empty-state', title: 'EmptyState 空状态',
    summary: '用于没有可展示内容的区域，并可提供下一步操作。',
    guidance: '区分尚无数据与筛选后无结果，操作按钮应与原因对应。',
    accessibility: '标题与描述保留文本，不把关键信息只放在图标中。',
    themeTokens: ['--ui-text', '--ui-text-muted', '--ui-space-panel'],
    imports: 'UiEmptyState',
    api: ['title', 'description', 'icon/default slots'],
    usage: '<UiEmptyState title="暂无记录">操作按钮</UiEmptyState>',
  },
  {
    slug: 'select', title: 'Select 选择器',
    summary: '用于在有限选项中选择，支持搜索和多选。',
    guidance: '选项少且需要直接比较时优先考虑单选组；多选应明确已选数量。',
    accessibility: '关联可见 label，并检查键盘选择与下拉层焦点。',
    themeTokens: ['--ui-border', '--ui-focus', '--ui-surface-raised'],
    imports: 'UiSelect, UiOption',
    api: ['v-model', 'disabled', 'clearable', 'multiple', 'filterable', 'default/empty slots'],
    usage: '<UiSelect v-model="value"><UiOption label="选项" value="a" /></UiSelect>',
  },
  {
    slug: 'form', title: 'Form 表单',
    summary: '统一标签与错误样式；字段、规则和验证仍遵循 Element Plus。',
    guidance: '按任务顺序组织字段；验证规则与提交结果由业务页面负责。',
    accessibility: '每个字段使用 UiFormItem 的 label，并让错误与对应字段关联。',
    themeTokens: ['--ui-danger', '--ui-space-content', '--ui-text'],
    imports: 'UiForm, UiFormItem',
    api: ['model', 'labelPosition', 'labelWidth', 'size', 'UiFormItem'],
    usage: '<UiForm :model="form"><UiFormItem label="名称" prop="name">...</UiFormItem></UiForm>',
  },
  {
    slug: 'table', title: 'Table 表格',
    summary: '统一表头、边框和空状态；列定义仍遵循 Element Plus。',
    guidance: '只展示需要比较的数据；分页、远端查询和排序由业务组合层决定。',
    accessibility: '列标题应准确描述数据；空结果提供可理解的反馈。',
    themeTokens: ['--ui-surface', '--ui-surface-raised', '--ui-border'],
    imports: 'UiTable, UiTableColumn',
    api: ['data', 'stripe', 'border', 'height', 'UiTableColumn', 'empty/append slots'],
    usage: '<UiTable :data="rows"><UiTableColumn prop="name" label="名称" /></UiTable>',
  },
]
