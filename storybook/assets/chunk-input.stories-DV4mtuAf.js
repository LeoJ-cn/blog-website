import{r as l}from"./entry-iframe-CPFlSYa8.js";import{_ as p}from"./chunk-input-lfai_aEd.js";import"./chunk-preload-helper-C1FmrZbK.js";import"./chunk-index-DZ6DvFD1.js";import"./chunk-index-CCZ6JWK3.js";import"./chunk-index-DstuFNIG.js";import"./chunk-install-C6AfjDcU.js";import"./chunk-types-CZ1WTnOf.js";import"./chunk-use-form-common-props-CBhW0rev.js";import"./chunk-index-BWC5EpnK.js";import"./chunk-size-BmYZHWVL.js";import"./chunk-icon-BODOp2S5.js";import"./chunk-typescript-Bp3YSIOJ.js";import"./chunk-index-DQ8j2WxT.js";import"./chunk-_baseGet-D_psVKTL.js";import"./chunk-event-HEVJa2N9.js";import"./chunk-index-C-OZXrhJ.js";import"./chunk-error-Cq9Fpw4b.js";const C={title:"UI/Input",component:p,args:{placeholder:"请输入名称",disabled:!1,clearable:!0}},e={render:u=>({components:{UiInput:p},setup(){const m=l("");return{args:u,value:m}},template:'<div class="ui-story"><UiInput v-model="value" v-bind="args" class="ui-story__field" /><span>当前值：{{ value || "空" }}</span></div>'})},r={args:{disabled:!0,modelValue:"不可编辑"}},O=["Default","Disabled"];var t,a,s;e.parameters={...e.parameters,docs:{...(t=e.parameters)==null?void 0:t.docs,source:{originalSource:`{
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
}`,...(s=(a=e.parameters)==null?void 0:a.docs)==null?void 0:s.source}}};var o,n,i;r.parameters={...r.parameters,docs:{...(o=r.parameters)==null?void 0:o.docs,source:{originalSource:`{
  args: {
    disabled: true,
    modelValue: '不可编辑'
  }
}`,...(i=(n=r.parameters)==null?void 0:n.docs)==null?void 0:i.source}}};export{e as Default,r as Disabled,O as __namedExportsOrder,C as default};
