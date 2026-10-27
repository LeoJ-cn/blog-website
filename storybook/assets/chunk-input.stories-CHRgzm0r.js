import{r as m}from"./entry-iframe-BG0HnIjD.js";import{_ as i}from"./chunk-input-AxQR3Y-k.js";import"./chunk-preload-helper-C1FmrZbK.js";import"./chunk-index-BuxAdwU-.js";import"./chunk-install-SUwAjiki.js";import"./chunk-index-BZ5rke7W.js";import"./chunk-index-BLSA25XI.js";import"./chunk-use-form-common-props-C04mMRC9.js";import"./chunk-icon-jEKz-EoP.js";import"./chunk-typescript-Bp3YSIOJ.js";import"./chunk-index-BV_2xh52.js";import"./chunk-event-BS8pVKsY.js";import"./chunk-index-BPO_U6GW.js";import"./chunk-error-Cq9Fpw4b.js";const x={title:"UI/Input",component:i,args:{placeholder:"请输入名称",disabled:!1,clearable:!0}},e={render:p=>({components:{UiInput:i},setup(){const l=m("");return{args:p,value:l}},template:'<div class="ui-story"><UiInput v-model="value" v-bind="args" class="ui-story__field" /><span>当前值：{{ value || "空" }}</span></div>'})},r={args:{disabled:!0,modelValue:"不可编辑"}},S=["Default","Disabled"];var a,s,t;e.parameters={...e.parameters,docs:{...(a=e.parameters)==null?void 0:a.docs,source:{originalSource:`{
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
}`,...(t=(s=e.parameters)==null?void 0:s.docs)==null?void 0:t.source}}};var o,n,u;r.parameters={...r.parameters,docs:{...(o=r.parameters)==null?void 0:o.docs,source:{originalSource:`{
  args: {
    disabled: true,
    modelValue: '不可编辑'
  }
}`,...(u=(n=r.parameters)==null?void 0:n.docs)==null?void 0:u.source}}};export{e as Default,r as Disabled,S as __namedExportsOrder,x as default};
