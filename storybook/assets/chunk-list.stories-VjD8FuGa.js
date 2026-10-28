import{_ as f}from"./chunk-avatar-DOP4XMZV.js";import{p as U,z as s,F as L,D as g,E as k,y as o,x as i,G as b,B as x}from"./entry-iframe-CPFlSYa8.js";import"./chunk-index-DstuFNIG.js";import"./chunk-install-C6AfjDcU.js";import"./chunk-types-CZ1WTnOf.js";import"./chunk-index-CCZ6JWK3.js";import"./chunk-size-BmYZHWVL.js";import"./chunk-icon-BODOp2S5.js";import"./chunk-preload-helper-C1FmrZbK.js";const A={key:1,class:"ui-list__empty",role:"status"},e=U({__name:"UiList",props:{items:{},density:{default:"default"},divided:{type:Boolean,default:!0},emptyText:{default:"暂无数据"}},setup(v){const t=v;return(r,C)=>t.items.length?(i(),s("ul",{key:0,class:k(["ui-list",[`ui-list--${t.density}`,{"ui-list--divided":t.divided}]])},[(i(!0),s(L,null,g(t.items,(l,_)=>(i(),s("li",{key:l.key,class:"ui-list__item"},[o(r.$slots,"default",{item:l,index:_})]))),128))],2)):(i(),s("div",A,[o(r.$slots,"empty",{},()=>[b(x(t.emptyText),1)])]))}});e.__docgenInfo=Object.assign({displayName:e.name??e.__name},{exportName:"default",displayName:"UiList",description:"",tags:{},props:[{name:"items",required:!0,type:{name:"TSTypeOperator"}},{name:"density",required:!1,type:{name:"UiListDensity"},defaultValue:{func:!1,value:"'default'"}},{name:"divided",description:"默认显示行间分隔线；关闭后仍保留列表项自身间距。",required:!1,type:{name:"boolean"},defaultValue:{func:!1,value:"true"}},{name:"emptyText",required:!1,type:{name:"string"},defaultValue:{func:!1,value:"'暂无数据'"}}],slots:[{name:"default",scoped:!0,bindings:[{name:"item",title:"binding",description:""},{name:"index",title:"binding",description:""}]},{name:"empty"}],sourceFiles:["/home/runner/work/blog-website/blog-website/packages/ui/src/components/UiList.vue"]});const F={title:"UI/List",component:e},w=[{key:"natali",name:"Natali Craig",role:"Designer"},{key:"drew",name:"Drew Cano",role:"Developer"},{key:"andi",name:"Andi Lane",role:"Product Manager"}],a={render:()=>({components:{UiAvatar:f,UiList:e},setup:()=>({contacts:w}),template:'<div class="ui-story"><div class="ui-story__panel"><UiList :items="contacts"><template #default="{ item }"><div class="ui-story__row"><UiAvatar size="small">{{ item.name.slice(0, 1) }}</UiAvatar><span>{{ item.name }}</span><small>{{ item.role }}</small></div></template></UiList></div></div>'})},n={render:()=>({components:{UiList:e},template:'<div class="ui-story"><div class="ui-story__panel"><UiList :items="[]"><template #empty>暂无联系人</template></UiList></div></div>'})},V=["Contacts","Empty"];var m,d,p;a.parameters={...a.parameters,docs:{...(m=a.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: () => ({
    components: {
      UiAvatar,
      UiList
    },
    setup: () => ({
      contacts
    }),
    template: '<div class="ui-story"><div class="ui-story__panel"><UiList :items="contacts"><template #default="{ item }"><div class="ui-story__row"><UiAvatar size="small">{{ item.name.slice(0, 1) }}</UiAvatar><span>{{ item.name }}</span><small>{{ item.role }}</small></div></template></UiList></div></div>'
  })
}`,...(p=(d=a.parameters)==null?void 0:d.docs)==null?void 0:p.source}}};var c,u,y;n.parameters={...n.parameters,docs:{...(c=n.parameters)==null?void 0:c.docs,source:{originalSource:`{
  render: () => ({
    components: {
      UiList
    },
    template: '<div class="ui-story"><div class="ui-story__panel"><UiList :items="[]"><template #empty>暂无联系人</template></UiList></div></div>'
  })
}`,...(y=(u=n.parameters)==null?void 0:u.docs)==null?void 0:y.source}}};export{a as Contacts,n as Empty,V as __namedExportsOrder,F as default};
