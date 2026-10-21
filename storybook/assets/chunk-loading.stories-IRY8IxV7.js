import{e as d,f as p,i as o,t as u,o as c}from"./entry-iframe-D03o_7fk.js";import"./chunk-preload-helper-C1FmrZbK.js";const m={class:"ui-loading",role:"status","aria-live":"polite"},e=d({__name:"UiLoading",props:{label:{default:"加载中…"}},setup(s){return(l,n)=>(c(),p("span",m,[n[0]||(n[0]=o("span",{class:"ui-loading__spinner","aria-hidden":"true"},null,-1)),o("span",null,u(l.label),1)]))}});e.__docgenInfo=Object.assign({displayName:e.name??e.__name},{exportName:"default",displayName:"UiLoading",description:"",tags:{},props:[{name:"label",required:!1,type:{name:"string"},defaultValue:{func:!1,value:"'加载中…'"}}],sourceFiles:["/home/runner/work/blog-website/blog-website/packages/ui/src/components/UiLoading.vue"]});const f={title:"UI/Loading",component:e,args:{label:"正在加载数据…"}},a={render:s=>({components:{UiLoading:e},setup:()=>({args:s}),template:'<div class="ui-story"><UiLoading v-bind="args" /></div>'})},b=["Default"];var t,i,r;a.parameters={...a.parameters,docs:{...(t=a.parameters)==null?void 0:t.docs,source:{originalSource:`{
  render: args => ({
    components: {
      UiLoading
    },
    setup: () => ({
      args
    }),
    template: '<div class="ui-story"><UiLoading v-bind="args" /></div>'
  })
}`,...(r=(i=a.parameters)==null?void 0:i.docs)==null?void 0:r.source}}};export{a as Default,b as __namedExportsOrder,f as default};
