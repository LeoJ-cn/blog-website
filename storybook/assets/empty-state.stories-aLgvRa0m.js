import{_ as c}from"./button-BpV2YpI8.js";import{e as d,f as i,h as o,i as n,t as r,j as y,o as p}from"./iframe-QlNHdS9c.js";import"./use-form-common-props-CLYTvOA4.js";import"./index-CCTl5ieM.js";import"./icon-Bvqks1h6.js";import"./preload-helper-C1FmrZbK.js";const _={class:"ui-empty-state","aria-live":"polite"},f={class:"ui-empty-state__title"},U={class:"ui-empty-state__description"},g={key:0,class:"ui-empty-state__actions"},e=d({__name:"UiEmptyState",props:{title:{default:"暂无内容"},description:{default:"这里还没有可展示的内容。"}},setup(a){return(t,E)=>(p(),i("section",_,[o(t.$slots,"icon"),n("h3",f,r(t.title),1),n("p",U,r(t.description),1),t.$slots.default?(p(),i("div",g,[o(t.$slots,"default")])):y("",!0)]))}});e.__docgenInfo=Object.assign({displayName:e.name??e.__name},{exportName:"default",displayName:"UiEmptyState",description:"",tags:{},props:[{name:"title",required:!1,type:{name:"string"},defaultValue:{func:!1,value:"'暂无内容'"}},{name:"description",required:!1,type:{name:"string"},defaultValue:{func:!1,value:"'这里还没有可展示的内容。'"}}],slots:[{name:"icon"},{name:"default"}],sourceFiles:["/home/runner/work/blog-website/blog-website/packages/ui/src/components/UiEmptyState.vue"]});const N={id:"ui-empty-state",title:"UI/EmptyState",component:e,args:{title:"暂无结果",description:"调整筛选条件后再试。"}},s={render:a=>({components:{UiButton:c,UiEmptyState:e},setup:()=>({args:a}),template:'<div class="ui-story"><UiEmptyState v-bind="args"><UiButton type="primary">清空筛选</UiButton></UiEmptyState></div>'})},V=["Default"];var m,l,u;s.parameters={...s.parameters,docs:{...(m=s.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: args => ({
    components: {
      UiButton,
      UiEmptyState
    },
    setup: () => ({
      args
    }),
    template: '<div class="ui-story"><UiEmptyState v-bind="args"><UiButton type="primary">清空筛选</UiButton></UiEmptyState></div>'
  })
}`,...(u=(l=s.parameters)==null?void 0:l.docs)==null?void 0:u.source}}};export{s as Default,V as __namedExportsOrder,N as default};
