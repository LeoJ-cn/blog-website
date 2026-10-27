import{d as p,i as d,j as u,m as g,u as f,o as _,k as z}from"./entry-iframe-BG0HnIjD.js";import{E as b}from"./chunk-index-BZ5rke7W.js";import"./chunk-preload-helper-C1FmrZbK.js";import"./chunk-install-SUwAjiki.js";const e=p({inheritAttrs:!1,__name:"UiIcon",props:{size:{},color:{}},setup(a){return(o,C)=>(_(),d(f(b),g({class:"ui-icon",size:o.size,color:o.color},o.$attrs),{default:u(()=>[z(o.$slots,"default")]),_:3},16,["size","color"]))}});e.__docgenInfo=Object.assign({displayName:e.name??e.__name},{exportName:"default",displayName:"UiIcon",description:"",tags:{},props:[{name:"size",description:"图标尺寸：数字按 px 解释，字符串使用合法的 CSS 长度。",required:!1,type:{name:"union",elements:[{name:"number"},{name:"string"}]}},{name:"color",description:"图标颜色：接受合法的 CSS color 值，未设置时继承当前文本颜色。",required:!1,type:{name:"string"}}],slots:[{name:"default"}],sourceFiles:["/home/runner/work/blog-website/blog-website/packages/ui/src/components/UiIcon.vue"]});const k={title:"基础组件/Icon",component:e,tags:["autodocs"],args:{size:24,color:"#2563eb"},render:a=>({components:{UiIcon:e},setup(){return{args:a}},template:`
      <UiIcon v-bind="args" aria-label="收藏">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="m12 17.27 5.18 3.13-1.37-5.89 4.57-3.96-6.02-.51L12 4.5 9.64 10.04l-6.02.51 4.57 3.96-1.37 5.89L12 17.27Z"
          />
        </svg>
      </UiIcon>
    `})},r={},s={args:{size:"2rem",color:"#7c3aed"}},v=["Default","CustomSizeAndColor"];var n,t,i;r.parameters={...r.parameters,docs:{...(n=r.parameters)==null?void 0:n.docs,source:{originalSource:"{}",...(i=(t=r.parameters)==null?void 0:t.docs)==null?void 0:i.source}}};var c,m,l;s.parameters={...s.parameters,docs:{...(c=s.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    size: '2rem',
    color: '#7c3aed'
  }
}`,...(l=(m=s.parameters)==null?void 0:m.docs)==null?void 0:l.source}}};export{s as CustomSizeAndColor,r as Default,v as __namedExportsOrder,k as default};
