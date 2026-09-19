<template>
  <div class="ai-common-image-panel" v-show="imagePanelShow" v-if="imagePanelData.list.length>0"  @mouseup="endMove">
    <div class="ai-common-image-panel__container">
      <div class="ai-common-image-panel__content" ref="imageContent">
        <div :style="position" @mousemove="moveImage" @mousedown="startMove" class="ai-common-image-panel__move-content" id="imagePanelLazy">
          <div :style="imageStyle" class="ai-common-image-panel__canvas" v-if="isUseCanvas&&imageType==='image'" >
            <ai-common-image-loader :item="imagePanelData.list[currentIndex].item" :key="currentIndex" @imageLoaded="imageLoaded" :size="panelSize"></ai-common-image-loader>
            <img src="./loading.gif" v-if="isShowLoading">
          </div>
          <ai-common-lazy :key="currentIndex" class="ai-common-image-panel__lazy" :options="{root:'#imagePanelLazy',delay:0}"
              :lazy-task="asyncload(imagePanelData.list[currentIndex])" v-if="!isUseCanvas||imageType!=='image'">
            <img class="ai-common-image-panel__image" :src="props.data" slot-scope="props" :style="imageStyle" draggable="false">
          </ai-common-lazy>
        </div>
      </div>
      <div class="ai-common-image-panel__info">{{(currentIndex+1)+ '/'+ imageCount}}</div>
      <div class="ai-common-image-panel__tab" v-if="imagePanelData.type!='image'">
        <label class="ai-common-image-panel__thumb-tab" @click="updateImgTab('image')"><span class="check-btn" :class="{'check-btn-active':imageType==='image'}"></span><span>{{localTxt[lang].image}}</span></label>
        <label class="ai-common-image-panel__thumb-tab" @click="updateImgTab('pdfImage')"><span class="check-btn" :class="{'check-btn-active':imageType==='pdfImage'}"></span><span>{{localTxt[lang].page}}</span></label>
      </div>
    </div>
    <div class="ai-common-image-panel__banner" v-if="isStart">
      <div class="ai-common-image-panel__banner-content" :style="bannerStyle" id="imagePanelLazyBanner">
        <div class="ai-common-image-panel__image-box"
          @click="selectImage(index)"
          v-for="(item, index) in imagePanelData.list" 
          :key="index"
          :data-id="index"
          :class="{'ai-common-image-panel__active':index===currentIndex}">
            <ai-common-image-loader v-if="isUseCanvas" :item="item.item" :size="{width:70, height:70}"></ai-common-image-loader>
            <ai-common-lazy class="ai-common-image-panel__lazy"
              :key="'v_'+index"
              :options="{root:'#imagePanelLazyBanner',delay:0 }"
              :lazy-task="asyncload(item)" 
              v-if="!isUseCanvas">
                <img :src="props.data" slot-scope="props">
            </ai-common-lazy>
        </div>
      </div>
    </div>
    <div class="ai-common-image-panel__left" @click="toPrev" v-show="currentIndex>0"><img src="./left.png" width="20" height="20" alt=""></div>
    <div class="ai-common-image-panel__right" @click="toNext" v-show="currentIndex<imagePanelData.list.length-1"><img src="./right.png" width="20" height="20" alt=""></div>
    <div class="ai-common-image-panel__close" @click="close"><img src="./cross.png" width="20" height="20" alt=""></div>
    <div class="ai-common-image-panel__enlarge" @click="enlarge"><img src="./scale.png" width="20" height="20" alt=""></div>
    <div class="ai-common-image-panel__narrow" @click="narrow"><img src="./scale1.png" width="20" height="20" alt=""></div>
    <div class="ai-common-image-panel__scroll" @click="scroll"><img src="./scroll.png" width="20" height="20" alt=""></div>
  </div>
</template>

<script>
import AiCommonLazy from '../../lazy';
import AiCommonImageLoader from '../../image-loader';
import {localTxt} from './localTxt.js';
import {get} from 'lodash';
export default {
  name: 'AiCommonImagePanel',
  data() {
    return {
      currentIndex: 0,
      winWidth: 0,
      rateNum: 0,
      imageContent: {
        width: 0,
        height: 0
      },
      imageContainer: {
        width: 0,
        height: 0
      },
      size: 1,
      position: {},
      startPosition: {},
      isMoving: false,
      isShowLoading: true,
      isStart: false,
      imageType: 'image',
      panelSize: {},
      localTxt: localTxt
    };
  },
  props: {
    pdfImageData: {
      type: Object,
      default: ()=>{}
    },
    imageData: {
      type: Object,
      default: ()=>{}
    },
    imagePanelShow: {
      type: Boolean
    },
    scale: {
      default: ()=>{
        return {
          step: 0.2,
          max: 4,
          min: 0.5
        };
      }
    }
  },
  components: {
    AiCommonLazy,
    AiCommonImageLoader
  },
  computed: {
    imagePanelData() {
      return this.imageData;
      // return this.imageType === 'image' ? this.imageData : this.pdfImageData;
    },
    imageCount() {
      return Math.max(this.imagePanelData.list.length, this.imagePanelData.total);
    },
    bannerStyle() {
      let left = 0;
      let width = this.imagePanelData.list.length * 80 - 10;
      let maxNum = parseInt(this.winWidth / 80, 10);
      if (width > this.winWidth) {
        if (this.currentIndex + 1 > maxNum) {
          let page = parseInt((this.currentIndex) / maxNum, 10);
          left = page * maxNum * 80;
          let maxLeft = width - this.winWidth;
          left = -(left > maxLeft ? maxLeft : left);
        } else {
          left = 0;
        }
      } else {
        left = (this.winWidth - width) / 2;
      }
      return {
        'left': left + 'px',
        'width': width + 'px'
      };
    },
    imageStyle() {
      return Object.assign({
        'transform': `translate(-50%,-50%) rotate(${(this.rateNum % 6) * 90}deg) scale(${this.size},${this.size})`,
        '-ms-transform': `translate(-50%,-50%) rotate(${(this.rateNum % 6) * 90}deg) scale(${this.size},${this.size})`
      });
    },
    isUseCanvas() {
      return this.imagePanelData.type === 'canvas';
    },
    lang() {
      return get(this, '$i18n.locale', 'en');
    }
  },
  watch: {
    imagePanelData: {
      deep: true,
      handler: function() {
        this.currentIndex = this.imagePanelData.index;
      }
    },
    currentIndex(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.$emit('update-current-index', {index: newVal, imageType: this.imageType});
        this.isShowLoading = true;
      }
    }
  },
  methods: {
    toPrev() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.rateNum = 0;
        this.resetPosition();
        this.resetScale();
      }
    },
    toNext() {
      if (this.currentIndex + 1 < this.imagePanelData.list.length) {
        this.currentIndex++;
        this.rateNum = 0;
        this.resetPosition();
        this.resetScale();
      }
    },
    selectImage(index) {
      this.currentIndex = index;
      this.rateNum = 0;
      this.resetPosition();
      this.resetScale();
    },
    close() {
      this.$emit('image-panel-close');
      this.rateNum = 0;
      this.resetPosition();
      this.resetScale();
    },
    scroll() {
      this.imageContainer = {
        width: this.$refs.imageContent.parentElement.clientWidth,
        height: this.$refs.imageContent.parentElement.clientHeight
      };
      this.imageContent = {
        width: this.$refs.imageContent.clientWidth,
        height: this.$refs.imageContent.clientHeight
      };
      this.rateNum++;
      this.resetPosition();
    },
    enlarge() {
      if (this.size < this.scale.max) {
        this.size += this.scale.step;
        this.resetPosition();
      }
    },
    narrow() {
      if (this.size > this.scale.min) {
        this.size -= this.scale.step;
        this.resetPosition();
      }
    },
    asyncload(item) {
      let self = this;
      return function() {
        // let url = item.src;
        if (self.imagePanelData.type === 'canvas') {
          return self.imageType === 'image' ? item.item : item.item.path;
        } else {
          return item.src;
        }
      };
    },
    startMove(event) {
      this.isMoving = true;
      let {x, y} = event;
      let {offsetLeft, offsetTop} = this.$el.querySelector('.ai-common-image-panel__move-content');
      this.startPosition = {
        top: y - offsetTop,
        left: x - offsetLeft
      };
    },
    moveImage(event) {
      if (this.isMoving) {
        let {x, y} = event;
        this.position = {
          top: y - this.startPosition.top + 'px',
          left: x - this.startPosition.left + 'px'
        };
      }
    },
    endMove() {
      this.isMoving = false;
      this.startPosition = {
        top: 0,
        left: 0
      };
    },
    resetPosition() {
      this.position = {};
    },
    resetScale() {
      this.size = 1;
    },
    imageLoaded() {
      this.isShowLoading = false;
    },
    updateImgTab(type) {
      this.imageType = type;
      this.resetPosition();
      this.resetScale();
    }
  },
  mounted() {
    this.winWidth = document.body.clientWidth;
    this.currentIndex = this.imagePanelData.index;
    if (this.$el.querySelector('.ai-common-image-panel__canvas')) {
      this.panelSize.width = this.$el.querySelector('.ai-common-image-panel__canvas').clientWidth;
      this.panelSize.height = this.$el.querySelector('.ai-common-image-panel__canvas').clientHeight;
    };
    this.panelSize.origin = true;
    let self = this;
    setTimeout(()=>{
      self.isStart = true;
    }, 50);
  }
};
</script>
