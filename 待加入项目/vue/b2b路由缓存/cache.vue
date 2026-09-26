<template>
  <div class="report-center">
    <section class="left-container set-inline-block-top">
      <div class="list-container">
        <q-scroll-area :thumb-style="thumbStype">
          <div class="" v-for="(item, index) in menuList" :key="index">
            <div
              v-for="(children, index) in item.children"
              :key="index"
              class="new-children-menu"
              :class="{ active: isActive(children) }"
              @click="changeTab(children)"
            >
              <i class="bt" :class="children.icon"></i>
              {{ children.label }}
            </div>
          </div>
        </q-scroll-area>
      </div>
    </section>
    <section class="right-container set-inline-block-top">
      <div class="right-container-box">
        <el-tabs :value="activeTab" type="card" @tab-remove="removeTab" @tab-click="tabClick">
          <el-tab-pane
            v-for="item in editableTabs"
            :key="item.name"
            :closable="!!item.closable"
            :label="item.label"
            :name="item.name"
          >
            <span slot="label" :title="item.hoverName">{{ item.label }}</span>
          </el-tab-pane>
        </el-tabs>

        <div class="right-container-box__view">
          <keep-alive :include="cacheList">
            <router-view></router-view>
          </keep-alive>
        </div>
      </div>
    </section>
  </div>
</template>
<script>
import { thumbStype } from '@/deps/config'
import { forEach, cloneDeep, get, findIndex } from 'lodash'
import { mapGetters } from 'vuex'
import EventBus from '@/bus/eventBus'

const menuList = [
  {
    rootmenu: '报表中心',
    icon: 'bt-gongyingshang-xian',
    children: [
      {
        closable: true,
        label: '供应商送货往来账',
        name: 'report-delivery-ledger',
        path: '/main/report/report-delivery-ledger',
        icon: 'bt-gongyingshangsonghuowanglaizhang',
      },
      {
        closable: true,
        label: '总部配送往来账',
        name: 'report-headquarters-ledger',
        path: '/main/report/report-headquarters-ledger',
        icon: 'bt-zongbupeisongwanglaizhang',
        disabledOrgTypeList: [121],
      },
      {
        closable: true,
        label: '门店调拨往来账',
        name: 'report-store-transfer-ledger',
        path: '/main/report/report-store-transfer-ledger',
        icon: 'bt-mendiantiaobowanglaizhang',
        disabledOrgTypeList: [124, 125],
      },
      {
        closable: true,
        label: '门店收发结存表',
        name: 'report-store-receipt-distribution',
        path: '/main/report/report-store-receipt-distribution',
        icon: 'bt-mendianshoufajiecunbiao',
      },
      {
        closable: true,
        label: '部门调拨表',
        name: 'report-departmental-transfer',
        path: '/main/report/report-departmental-transfer',
        icon: 'bt-bumentiaobobiao',
      },
      {
        closable: true,
        label: '门店报损明细表',
        name: 'store-loss-list',
        path: '/main/report/store-loss-list',
        icon: 'bt-mendianbaosunmingxibiao',
      },
      {
        closable: true,
        label: '门店物资汇总表',
        name: 'store-supplies-summary-report',
        path: '/main/report/store-supplies-summary-report',
        icon: 'bt-mendianwuzihuizongbiao',
        disabledOrgTypeList: [124, 125],
      },
    ],
  },
]

/**
 * 缓存页面组件名  路由名 =》组件名 【默认路由name和组件名相同】
 */
const RouteNameToCompNameMap = (routeName) => {
  let compName = ''
  switch (routeName) {
    // 机构调出单详情
    case 'report-org-out-order-detail':
      compName = 'org-out-order-detail'
      break
    // 机构调入单详情
    case 'report-org-in-order-detail':
      compName = 'org-in-order-detail'
      break
    // 部门调拨单详情
    case 'report-dept-transfer-order-detail':
      compName = 'dept-transfer-order-detail'
      break
    // 报损单详情
    case 'report-loss-report-detail':
      compName = 'loss-report-detail'
      break
    // 物资收料单详情
    case 'report-materials-receive-order-detail':
      compName = 'materials-receive-order-detail'
      break
    // 配送出库单详情
    case 'report-distribution-outLibrary-order-detail':
      compName = 'distribution-outLibrary-order-detail'
      break
    default:
      compName = routeName
      break
  }
  return compName
}

export default {
  name: 'report-center',
  components: {},
  props: {},
  data() {
    return {
      updateKey: 0,
      menuList: [],
      thumbStype: thumbStype,
      activeTab: '',
      editableTabs: [],
      cacheList: [],
      store: {},
    }
  },

  created() {
    const orgType = this.$sessionStorage('userList').orgType
    const realMenus = cloneDeep(menuList)
    const validChildrenList = []
    forEach(realMenus[0].children, (item) => {
      const { disabledOrgTypeList = [] } = item
      if (disabledOrgTypeList.indexOf(orgType) === -1) {
        validChildrenList.push({ ...item })
      }
    })
    realMenus[0].children = validChildrenList
    this.menuList = realMenus

    EventBus.$on('addReportTab', this.onAddReportTabs)
    EventBus.$on('removeReportTab', this.onRemoveReportTab)
  },
  beforeDestroy() {
    EventBus.$off('addReportTab', this.onAddReportTabs)
    EventBus.$off('removeReportTab', this.onRemoveReportTab)
  },
  mounted() {},
  computed: {
    ...mapGetters({
      identity: 'role/identity',
    }),
  },
  destroyed() {},
  methods: {
    onAddReportTabs(tab) {
      this.addTabs(tab)
    },
    onRemoveReportTab(tabName) {
      this.removeTab(tabName)
    },
    changeTab(tab) {
      const exitTab = this.editableTabs.find((item) => item.name === tab.name)
      this.activeTab = tab.name
      this.$router.push({ name: tab.name }).then(() => {
        if (!exitTab) {
          this.editableTabs.push(tab)
          this.updateCompCatchList()
        }
      })
    },
    addTabs(tab) {
      const index = findIndex(this.editableTabs, { name: tab.name })
      if (index !== -1) {
        this.editableTabs.splice(index, 1)
        this.updateCompCatchList()
      }
      // 更新组件缓存
      this.$nextTick(() => {
        this.activeTab = tab.name
        this.editableTabs.push(tab)
        this.$router
          .push({
            name: tab.name,
            params: get(tab, 'params', {}),
            query: get(tab, 'query', {}),
          })
          .then(() => {
            this.updateCompCatchList()
          })
      })
    },
    updateCompCatchList() {
      const list = []
      forEach(this.editableTabs, (item) => {
        const routeName = item.name
        const cacheCompName = RouteNameToCompNameMap(routeName)
        cacheCompName && list.push(cacheCompName)
      })
      this.cacheList = list
    },
    getIsAuto(autoRouterPush) {
      return !(autoRouterPush === false)
    },
    removeTab(targetName, autoRouterPush = true) {
      const isAutoRouterPush = this.getIsAuto(autoRouterPush)
      let tabs = this.editableTabs
      let activeName = this.activeTab
      let nextAutoPathConfig = null

      if (activeName === targetName) {
        let index = tabs.findIndex((tab) => tab.name === targetName)
        let nextTab = tabs[index + 1] || tabs[index - 1]
        if (nextTab) {
          activeName = nextTab.name
          this.activeTab = activeName
          nextAutoPathConfig = { name: activeName }
        }
      }

      this.editableTabs = tabs.filter((tab) => tab.name !== targetName)
      if (!this.editableTabs.length) {
        nextAutoPathConfig = { name: 'report-default' }
      }

      // 路由跳转
      isAutoRouterPush && nextAutoPathConfig && this.$router.push(nextAutoPathConfig)
      // PS：缓存更新(remove 不需要等router push结束)
      this.updateCompCatchList()
    },
    tabClick(item) {
      //  组件缓存后， 规避往同一路由重复跳转，除非销毁组件
      if (this.activeTab === item.name) return
      this.activeTab = item.name
      this.$router.push({ name: item.name })
    },
    isActive(children) {
      let path = this.$route.path
      return path.includes(children.path)
    },
  },
}
</script>
<style lang="stylus">
@import '~@/css/utils.styl';
.report-center{
  width 100%
  height 100%
  .td-link {
    cursor pointer
    color: #1876d2
  }
  >.left-container{
    box-sizing border-box
    width 164px
    height 100%
    padding 8px 0
    border-right 1px solid $border_color
    .list-container{
      width 100%
      height 100%
      .q-scrollarea{
        width 100%
        height 100%
      }
      .new-children-menu{
        font-size: 14px;
        font-weight: 500;
        width 100%
        color: #000000;
        height 40px
        line-height 40px
        cursor pointer
        .bt{
          margin 0 12.75px;
        }
      }
      .children-menu{
        font-size 12px
        color: rgba(0, 0, 0, 0.85)
        padding-left 41px
        box-sizing border-box
        width 100%
        height 40px
        line-height 40px
        cursor pointer
        &:hover{
          background-color #F1F2F3
        }
      }
      .active{
        background-color #F1F2F3
        pointer-events: none;
        font-weight: bold;
      }
    }
  }
  >.right-container{
    width calc(100% - 164px)
    height 100%
    background-color #f5f5f5
    .right-container-box {
      height: 100%;
      padding: 8px;
      // background: blue;
      .el-tabs--card>.el-tabs__header .el-tabs__nav {
        border none
      }
      .el-tabs__header {
        margin-bottom 0
      }
      .el-tabs--card>.el-tabs__header {
        border-bottom none
      }
      .el-tabs__item {
        background-color rgb(242,244,245)
        border-radius 4px 4px 0 0
        padding 0 16px
      }
      .el-tabs__item.is-active {
        color #F24E3E
        background-color #fff
        padding 0 16px
      }
      .el-tabs--card>.el-tabs__header .el-tabs__item.is-active.is-closable {
        padding 0 16px
      }
      .el-tabs__item:hover {
        color #F24E3E
      }
      .el-tabs__item:focus.is-active.is-focus:not(:active) {
        box-shadow none
        border none
      }
      .el-tabs--card>.el-tabs__header .el-tabs__item {
        border none
      }
    }
    .right-container-box__view{
      height: calc(100% - 40px);
    }
    .el-date-editor .el-range-separator{
      color: #979797 !important
      width: 8%
      font-size: 12px
    }
    .el-date-editor .el-range__icon{
      position: absolute
      right: 5px
      top: 1px
      color: rgba(0,0,0,0.85)
    }
    .el-date-editor--daterange.el-input__inner{
      width: 338px
    }
    .el-range-editor--small .el-range-input{
      font-size: 12px
    }
    .el-range-editor--mini.el-input__inner{
      width 205px
    }
    .extra-header-td{
      font-weight: 500;
      color: rgba(0,0,0,0.85)!important;
    }
  }
}
</style>
