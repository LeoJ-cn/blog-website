import { useMemo } from 'react'
import { A2uiSurface, MessageProcessor, basicCatalog } from '../a2ui/protocol'
import type { A2uiMessage, SurfaceModel, ReactCatalogComponent } from '../a2ui/protocol'

/**
 * Tab ②：A2UI 自带组件。
 *
 * basic catalog 的组件是 Lit Web Component，读取的是 A2uiSurface 注入的 controller.props，
 * 不能当普通 JSX 标签直接写。所以这里用一个独立的 processor + surface，
 * 发 createSurface / updateComponents 消息，让它们走自己的原生渲染路径。
 *
 * 用一个独立 processor（不是应用那个），避免与对话区的 surface 互相干扰。
 */
const SURFACE_ID = 'builtin-demo'

// 必须用 basicCatalog 自己的 id：MessageProcessor 只认注册表里对得上的 catalogId，
// 若写成我们自己的 CATALOG_ID，surface 会创建失败且没有任何报错，页面直接空白。
const BUILTIN_CATALOG_ID = basicCatalog.id

const builtinMessages: A2uiMessage[] = [
  { version: 'v0.9', createSurface: { surfaceId: SURFACE_ID, catalogId: BUILTIN_CATALOG_ID } },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: SURFACE_ID,
      components: [
        {
          id: 'root',
          component: 'Column',
          children: [
            'title',
            'tip',
            'divider1',
            'textBlock',
            'divider2',
            'layoutBlock',
            'divider3',
            'inputBlock',
            'divider4',
            'mediaBlock',
          ],
        },
        { id: 'title', component: 'Text', text: 'A2UI 自带组件', variant: 'h2' },
        {
          id: 'tip',
          component: 'Text',
          text: '以下 18 个组件全部来自 basic catalog，直接用 A2UI 消息渲染，没有经过我们的 UI 库。',          variant: 'caption',
        },

        // ---- 内容类 ----
        { id: 'divider1', component: 'Divider', axis: 'horizontal' },
        { id: 'textBlock', component: 'Card', child: 'textInner' },
        {
          id: 'textInner',
          component: 'Column',
          // v0.9 的 children 只接受字符串 id；写成内联组件对象会校验失败导致整页空白
          children: ['lblText', 'textBody', 'iconRow'],
        },
        { id: 'lblText', component: 'Text', text: 'Text / Icon', variant: 'h5' },
        { id: 'textBody', component: 'Text', text: 'Text 支持 Markdown 与 h1~h5 变体。', variant: 'body' },
        { id: 'iconRow', component: 'Row', children: ['iconCheck', 'iconSearch', 'iconSettings'] },
        { id: 'iconCheck', component: 'Icon', name: 'check' },
        { id: 'iconSearch', component: 'Icon', name: 'search' },
        { id: 'iconSettings', component: 'Icon', name: 'settings' },

        // ---- 布局类 ----
        { id: 'divider2', component: 'Divider', axis: 'horizontal' },
        { id: 'layoutBlock', component: 'Card', child: 'layoutInner' },
        {
          id: 'layoutInner',
          component: 'Column',
          children: ['lblLayout', 'demoRow', 'demoList', 'demoTabs'],
        },
        { id: 'lblLayout', component: 'Text', text: 'Row / Column / List / Tabs', variant: 'h5' },
        {
          id: 'demoRow',
          component: 'Row',
          children: ['rowA', 'rowB'],
          justify: 'start',
        },
        { id: 'rowA', component: 'Text', text: 'Row 子项 A', variant: 'body' },
        { id: 'rowB', component: 'Text', text: 'Row 子项 B', variant: 'body' },
        {
          id: 'demoList',
          component: 'List',
          children: ['listItem1', 'listItem2'],
          direction: 'vertical',
        },
        { id: 'listItem1', component: 'Text', text: 'List 项 1', variant: 'body' },
        { id: 'listItem2', component: 'Text', text: 'List 项 2', variant: 'body' },
        {
          id: 'demoTabs',
          component: 'Tabs',
          tabs: [
            { title: '标签一', child: 'tabContent1' },
            { title: '标签二', child: 'tabContent2' },
          ],
        },
        { id: 'tabContent1', component: 'Text', text: '第一个标签的内容', variant: 'body' },
        { id: 'tabContent2', component: 'Text', text: '第二个标签的内容', variant: 'body' },

        // ---- 输入类 ----
        { id: 'divider3', component: 'Divider', axis: 'horizontal' },
        { id: 'inputBlock', component: 'Card', child: 'inputInner' },
        {
          id: 'inputInner',
          component: 'Column',
          children: [
            'lblInput',
            'biTextField',
            'biCheckBox',
            'biChoice',
            'biSlider',
            'biDate',
            'biButtonRow',
          ],
        },
        {
          id: 'lblInput',
          component: 'Text',
          text: 'Button / TextField / CheckBox / ChoicePicker / Slider / DateTimeInput',
          variant: 'h5',
        },
        { id: 'biTextField', component: 'TextField', label: 'basic TextField', value: { path: '/demo/text' } },
        { id: 'biCheckBox', component: 'CheckBox', label: 'basic CheckBox', value: { path: '/demo/checked' } },
        {
          id: 'biChoice',
          component: 'ChoicePicker',
          label: 'basic ChoicePicker',
          options: [
            { label: '选项一', value: 'a' },
            { label: '选项二', value: 'b' },
          ],
          value: { path: '/demo/choice' },
          displayStyle: 'checkbox',
        },
        {
          id: 'biSlider',
          component: 'Slider',
          label: 'basic Slider',
          min: 0,
          max: 100,
          value: { path: '/demo/slider' },
        },
        {
          id: 'biDate',
          component: 'DateTimeInput',
          label: 'basic DateTimeInput',
          value: { path: '/demo/date' },
          enableDate: true,
          enableTime: false,
        },
        {
          id: 'biButtonRow',
          component: 'Row',
          children: ['biButtonPrimary', 'biButtonDefault', 'biButtonBorderless'],
        },
        { id: 'biButtonPrimary', component: 'Button', variant: 'primary', child: 'biBtnLabel1', action: { event: { name: 'builtin-primary' } } },
        { id: 'biBtnLabel1', component: 'Text', text: 'primary', variant: 'body' },
        { id: 'biButtonDefault', component: 'Button', variant: 'default', child: 'biBtnLabel2', action: { event: { name: 'builtin-default' } } },
        { id: 'biBtnLabel2', component: 'Text', text: 'default', variant: 'body' },
        { id: 'biButtonBorderless', component: 'Button', variant: 'borderless', child: 'biBtnLabel3', action: { event: { name: 'builtin-borderless' } } },
        { id: 'biBtnLabel3', component: 'Text', text: 'borderless', variant: 'body' },

        // ---- 媒体类 ----
        { id: 'divider4', component: 'Divider', axis: 'horizontal' },
        { id: 'mediaBlock', component: 'Card', child: 'mediaInner' },
        {
          id: 'mediaInner',
          component: 'Column',
          children: ['lblMedia', 'biImage', 'lblAv', 'biVideo', 'biAudio', 'lblModal', 'biModal'],
        },
        { id: 'lblMedia', component: 'Text', text: 'Image', variant: 'h5' },
        {
          id: 'biImage',
          component: 'Image',
          url: 'https://placehold.co/240x120/e8eef7/1a73e8?text=Image',
          description: '占位图',
        },
        { id: 'lblAv', component: 'Text', text: 'Video / AudioPlayer', variant: 'h5' },
        {
          id: 'biVideo',
          component: 'Video',
          url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        },
        {
          id: 'biAudio',
          component: 'AudioPlayer',
          url: 'https://www.w3schools.com/html/horse.mp3',
          description: '示例音频',
        },
        // basic 的 Modal 用 trigger 指向触发组件 id；
        // buildChild 无法给子节点注入 onClick，因此这里把 trigger 指向一个独立按钮节点。
        { id: 'lblModal', component: 'Text', text: 'Modal', variant: 'h5' },
        {
          id: 'biModal',
          component: 'Modal',
          trigger: 'biModalTrigger',
          content: 'biModalContent',
        },
        {
          id: 'biModalTrigger',
          component: 'Button',
          variant: 'default',
          child: 'biModalTriggerText',
          action: { event: { name: 'builtin-modal-trigger' } },
        },
        { id: 'biModalTriggerText', component: 'Text', text: '打开 basic Modal', variant: 'body' },
        {
          id: 'biModalContent',
          component: 'Text',
          text: '这是 basic catalog 的 Modal 内容。',
          variant: 'body',
        },
      ],
    },
  },
  {
    version: 'v0.9',
    updateDataModel: {
      surfaceId: SURFACE_ID,
      path: '/',
      value: {
        demo: {
          text: '可编辑文本',
          checked: true,
          choice: ['a'],
          slider: 40,
          date: '2026-11-17',
        },
      },
    },
  },
]

export function BuiltinDemo() {
  const surfaces = useMemo(() => {
    // 这里只注册 basic catalog：本 tab 要展示的就是「A2UI 自带组件」，
    // 若混入我们的自建实现，展示的就不是自带组件了。
    const p = new MessageProcessor<ReactCatalogComponent>([basicCatalog as never], undefined, {
      reportErrorsOnly: true,
    })
    p.processMessages(builtinMessages)
    return [...p.getSurfaces().values()] as SurfaceModel<ReactCatalogComponent>[]
  }, [])

  return (
    <div className="demo-stack">
      <div className="demo-surface-host">
        {surfaces.map((surface) => (
          <A2uiSurface key={surface.id} surface={surface} />
        ))}
      </div>
    </div>
  )
}
