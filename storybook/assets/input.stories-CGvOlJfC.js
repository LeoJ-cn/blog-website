import{r as d}from"./iframe-QlNHdS9c.js";import{_ as l}from"./input-DV_zWw9x.js";import"./preload-helper-C1FmrZbK.js";import"./index-DMSQ87M-.js";import"./use-form-common-props-CLYTvOA4.js";import"./event-EmqagHE9.js";import"./icon-Bvqks1h6.js";import"./index-Dwd7DDlf.js";const F={title:"UI/Input",component:l,args:{placeholder:"请输入名称",disabled:!1,clearable:!0}},e={render:i=>({components:{UiInput:l},setup(){const p=d("");return{args:i,value:p}},template:'<div class="ui-story"><UiInput v-model="value" v-bind="args" class="ui-story__field" /><span>当前值：{{ value || "空" }}</span></div>'})},r={args:{disabled:!0,modelValue:"不可编辑"}},I=["Default","Disabled"];var a,s,t;e.parameters={...e.parameters,docs:{...(a=e.parameters)==null?void 0:a.docs,source:{originalSource:`{
  render: args => ({
    components: {
      UiInput
    },
    setup() {
      const value = ref('');
      return {
        args,
        value
      };
    },
    template: '<div class="ui-story"><UiInput v-model="value" v-bind="args" class="ui-story__field" /><span>当前值：{{ value || "空" }}</span></div>'
  })
}`,...(t=(s=e.parameters)==null?void 0:s.docs)==null?void 0:t.source}}};var n,o,u;r.parameters={...r.parameters,docs:{...(n=r.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    disabled: true,
    modelValue: '不可编辑'
  }
}`,...(u=(o=r.parameters)==null?void 0:o.docs)==null?void 0:u.source}}};export{e as Default,r as Disabled,I as __namedExportsOrder,F as default};
