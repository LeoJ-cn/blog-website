import{p as C,q as x,t as v,v as U,u as y,x as V,y as D,r as E}from"./entry-iframe-CPFlSYa8.js";import{E as _}from"./chunk-index-C1PEkRtH.js";import"./chunk-preload-helper-C1FmrZbK.js";import"./chunk-use-form-common-props-CBhW0rev.js";import"./chunk-index-BWC5EpnK.js";import"./chunk-install-C6AfjDcU.js";import"./chunk-index-CCZ6JWK3.js";import"./chunk-size-BmYZHWVL.js";import"./chunk-index-DQ8j2WxT.js";import"./chunk-_baseGet-D_psVKTL.js";import"./chunk-event-HEVJa2N9.js";import"./chunk-types-CZ1WTnOf.js";import"./chunk-error-Cq9Fpw4b.js";import"./chunk-isEqual-QdjBvRVj.js";import"./chunk-_Uint8Array-BNTTMEcZ.js";import"./chunk-index-CNMLXqi2.js";const a=C({inheritAttrs:!1,__name:"UiCheckbox",props:{modelValue:{type:Boolean},disabled:{type:Boolean},indeterminate:{type:Boolean}},emits:["update:modelValue","change"],setup(n,{emit:r}){const i=r;function g(e){typeof e=="boolean"&&i("update:modelValue",e)}function f(e){typeof e=="boolean"&&i("change",e)}return(e,F)=>(V(),x(y(_),U({class:"ui-checkbox","model-value":e.modelValue,disabled:e.disabled,indeterminate:e.indeterminate},e.$attrs,{"onUpdate:modelValue":g,onChange:f}),{default:v(()=>[D(e.$slots,"default")]),_:3},16,["model-value","disabled","indeterminate"]))}});a.__docgenInfo=Object.assign({displayName:a.name??a.__name},{exportName:"default",displayName:"UiCheckbox",description:"",tags:{},props:[{name:"modelValue",required:!1,type:{name:"boolean"}},{name:"disabled",required:!1,type:{name:"boolean"}},{name:"indeterminate",description:"仅控制半选视觉状态，不改变 modelValue；调用方需在业务状态变化时主动清除。",required:!1,type:{name:"boolean"}}],events:[{name:"update:modelValue",type:{names:["boolean"]}},{name:"change",type:{names:["boolean"]}}],slots:[{name:"default"}],sourceFiles:["/home/runner/work/blog-website/blog-website/packages/ui/src/components/UiCheckbox.vue"]});const K={title:"UI/Checkbox",component:a,args:{disabled:!1,indeterminate:!1}},o={render:n=>({components:{UiCheckbox:a},setup(){const r=E(!1);return{args:n,checked:r}},template:'<div class="ui-story"><UiCheckbox v-model="checked" v-bind="args">接收更新通知</UiCheckbox><span>当前状态：{{ checked ? "已选中" : "未选中" }}</span></div>'})},s={args:{indeterminate:!0,modelValue:!1},render:n=>({components:{UiCheckbox:a},setup:()=>({args:n}),template:'<div class="ui-story"><UiCheckbox v-bind="args">部分选中</UiCheckbox></div>'})},t={args:{disabled:!0,modelValue:!0},render:n=>({components:{UiCheckbox:a},setup:()=>({args:n}),template:'<div class="ui-story"><UiCheckbox v-bind="args">不可更改</UiCheckbox></div>'})},L=["Default","Indeterminate","Disabled"];var d,m,c;o.parameters={...o.parameters,docs:{...(d=o.parameters)==null?void 0:d.docs,source:{originalSource:`{
  render: args => ({
    components: {
      UiCheckbox
    },
    setup() {
      const checked = ref(false);
      return {
        args,
        checked
      };
    },
    template: '<div class="ui-story"><UiCheckbox v-model="checked" v-bind="args">接收更新通知</UiCheckbox><span>当前状态：{{ checked ? "已选中" : "未选中" }}</span></div>'
  })
}`,...(c=(m=o.parameters)==null?void 0:m.docs)==null?void 0:c.source}}};var l,u,p;s.parameters={...s.parameters,docs:{...(l=s.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    indeterminate: true,
    modelValue: false
  },
  render: args => ({
    components: {
      UiCheckbox
    },
    setup: () => ({
      args
    }),
    template: '<div class="ui-story"><UiCheckbox v-bind="args">部分选中</UiCheckbox></div>'
  })
}`,...(p=(u=s.parameters)==null?void 0:u.docs)==null?void 0:p.source}}};var b,h,k;t.parameters={...t.parameters,docs:{...(b=t.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    disabled: true,
    modelValue: true
  },
  render: args => ({
    components: {
      UiCheckbox
    },
    setup: () => ({
      args
    }),
    template: '<div class="ui-story"><UiCheckbox v-bind="args">不可更改</UiCheckbox></div>'
  })
}`,...(k=(h=t.parameters)==null?void 0:h.docs)==null?void 0:k.source}}};export{o as Default,t as Disabled,s as Indeterminate,L as __namedExportsOrder,K as default};
