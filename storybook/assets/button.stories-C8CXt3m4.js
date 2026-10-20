import{_ as n}from"./button-BpV2YpI8.js";import"./iframe-QlNHdS9c.js";import"./preload-helper-C1FmrZbK.js";import"./use-form-common-props-CLYTvOA4.js";import"./index-CCTl5ieM.js";import"./icon-Bvqks1h6.js";const v={title:"UI/Button",component:n,args:{type:"primary",disabled:!1,loading:!1}},t={render:d=>({components:{UiButton:n},setup:()=>({args:d}),template:'<div class="ui-story"><UiButton v-bind="args">操作按钮</UiButton></div>'})},o={render:()=>({components:{UiButton:n},template:'<div class="ui-story"><div class="ui-story__row"><UiButton type="primary">主操作</UiButton><UiButton type="danger">危险操作</UiButton><UiButton disabled>禁用</UiButton><UiButton loading>加载中</UiButton></div></div>'})},y=["Default","States"];var e,i,r;t.parameters={...t.parameters,docs:{...(e=t.parameters)==null?void 0:e.docs,source:{originalSource:`{
  render: args => ({
    components: {
      UiButton
    },
    setup: () => ({
      args
    }),
    template: '<div class="ui-story"><UiButton v-bind="args">操作按钮</UiButton></div>'
  })
}`,...(r=(i=t.parameters)==null?void 0:i.docs)==null?void 0:r.source}}};var s,u,a;o.parameters={...o.parameters,docs:{...(s=o.parameters)==null?void 0:s.docs,source:{originalSource:`{
  render: () => ({
    components: {
      UiButton
    },
    template: '<div class="ui-story"><div class="ui-story__row"><UiButton type="primary">主操作</UiButton><UiButton type="danger">危险操作</UiButton><UiButton disabled>禁用</UiButton><UiButton loading>加载中</UiButton></div></div>'
  })
}`,...(a=(u=o.parameters)==null?void 0:u.docs)==null?void 0:a.source}}};export{t as Default,o as States,y as __namedExportsOrder,v as default};
