<template>
  <div id="image_preview_dialog" ref="imagePreview" class="ai-common-ImagePreviewDialog">
    <div class="image-preview-main-area">
      <div class="image-preview-dialog-content">
          <img class="patent-image" :src="imageUrl" ref="image"/>
      </div>
      <div class="image-preview-arrow image-preview-left-arrow">
          <PtIcon name="SolidArrowLeft" :width="14" />
      </div>
      <div class="image-preview-arrow image-preview-right-arrow">
          <PtIcon name="SolidArrowRight" :width="14" />
      </div>
    </div>
    <div class="image-preview-title">{{imageTitle}}</div>
  </div>
</template>

<script>
import $ from 'jquery';
import { get } from 'lodash';
import loadingImg from './black-normal.gif';
import Icon from '@pat-ui/icon';

export default {
  name: 'AiCommonImagePreviewDialog',
  components: {
    PtIcon: Icon
  },
  props: {
    descImage240List: {
      type: Object,
      default: () => {
        return {};
      }
    },
    descImageList: {
      type: Object,
      default: () => {
        return {};
      }
    },
    containerSelector: {
      type: String,
      default: ''
    },
    anchorElement: {
      type: String,
      default: ''
    },
    isSimpleMode: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      imageUrl: '',
      imageTitle: ''
    };
  },
  mounted() {
    $('body').append(this.$refs.imagePreview);
    this.bindPreviewDialog(this.containerSelector, this.anchorElement, this.isSimpleMode);
  },
  beforeDestroy() {
    this.clearEvent();
    if (this.$refs.imagePreview) {
      $(this.$refs.imagePreview).remove();
    }
  },
  methods: {
    clearEvent() {
      if (this.$dialog) {
        this.$dialog.off();
      }
      if (this.$container) {
        const anchorSelector = this.anchorElement;
        this.$container.off('mouseover', anchorSelector).off('mouseout', anchorSelector).off('click', anchorSelector);
      }
    },
    setImageAndTitle(imageId, imageTitle) {
      this.imageTitle = imageTitle;
      this.imageUrl = loadingImg;
      const tempImageUrl = get(this.descImageList, `[${imageId}].url`);
      $(this.$refs.image).one('load', () => {
        this.imageUrl = tempImageUrl;
      });
    },
    bindPreviewDialog(containerSelector, anchorElement, isSimpleMode) {
      const _this = this;
      let timer;
      let imageList = null;
      let imageIndex = -1;
      const imagePanelData = {
        index: 0,
        list: [],
        total: 1,
        type: 'image'
      };
      const $dialog = $('#image_preview_dialog');
      const $left = $('#image_preview_dialog .image-preview-left-arrow');
      const $right = $('#image_preview_dialog .image-preview-right-arrow');
      const anchorSelector = anchorElement || 'a.see-img-anchor';
      const $container = $(containerSelector);
      this.$container = $container;
      this.$dialog = $dialog;

      this.clearEvent();

      $container.on('mouseover', anchorSelector, function() {
        clearTimeout(timer);
        let obj = $(this);
        let imageId = obj.attr('img-id');
        let imageTitle = obj.attr('img-title');
        let imageIds = imageId && imageId.split(',');
        imagePanelData.list = [];
        imagePanelData.index = 0;
        if (imageIds && imageIds.length > 1) {
          // multiply image
          imageTitle = imageTitle && imageTitle.split(',');
          imageList = [];
          for (let i = 0; i < imageIds.length; i++) {
            imageList.push({
              imageId: imageIds[i],
              imageTitle: imageTitle[i]
            });
            imagePanelData.list.push({
              src: get(_this.descImageList, `[${imageIds[i]}].url`),
              path: get(_this.descImage240List, `[${imageIds[i]}].url`)
            });
          }
          imagePanelData.total = imagePanelData.list.length;
          imageIndex = 0;
          imageId = get(imageList, `[${imageIndex}].imageId`);
          imageTitle = get(imageList, `[${imageIndex}].imageTitle`);
          $right.show();
          $left.hide();
        } else {
          $right.hide();
          $left.hide();
          imagePanelData.list.push({
            src: get(_this.descImageList, `[${imageId}].url`),
            path: get(_this.descImage240List, `[${imageId}].url`)
          });
        }
        imagePanelData.total = imagePanelData.list.length;

        _this.setImageAndTitle(imageId, imageTitle);
        let offset = obj.offset();
        let _width = obj.width();
        let _height = obj.height();
        const dialogWidth = 362;
        const dialogHeight = 324;
        // Set hover div position
        if (window.innerWidth - offset.left - _width <= dialogWidth) {
          // left
          if (window.innerHeight - offset.top < dialogHeight) {
            // top
            $dialog.css({
              left: offset.left - dialogWidth,
              top: offset.top - dialogHeight + _height,
              position: 'absolute'
            }).show();
          } else {
            // bottom
            $dialog.css({
              left: offset.left - dialogWidth,
              top: offset.top,
              position: 'absolute'
            }).show();
          }
        } else {
          // right
          if (window.innerHeight - offset.top < dialogHeight) {
            // top
            $dialog.css({
              left: offset.left + _width,
              top: offset.top - dialogHeight + _height,
              position: 'absolute'
            }).show();
          } else {
            // bottom
            $dialog.css({
              left: offset.left + _width,
              top: offset.top,
              position: 'absolute'
            }).show();
          }
        }
      }).on('mouseout', anchorSelector, function() {
        timer = setTimeout(() => {
          $dialog.hide();
        }, 500);
      }).on('click', anchorSelector, function() {
        _this.$emit('showImagePanel', imagePanelData);
      });

      $dialog.find('.image-preview-title').show();

      $dialog.on('mouseover', function() {
        clearTimeout(timer);
      }).on('mouseout', function() {
        timer = setTimeout(function() {
          $dialog.hide();
        }, 500);
      });

      if (isSimpleMode) {
        $dialog.find('.image-preview-title').hide();
        return;
      };

      $dialog.on('click', '.image-preview-left-arrow', function(e) {
        e.stopPropagation();
        if (imageIndex < 1) {
          return;
        }
        imageIndex--;
        _this.setImageAndTitle(imageList[imageIndex].imageId, imageList[imageIndex].imageTitle);
        $right.show();
        if (imageIndex === 0) {
          $left.hide();
        }
      })
        .on('click', '.image-preview-right-arrow', function(e) {
          e.stopPropagation();
          if (imageIndex + 1 >= imageList.length) {
            return;
          }
          imageIndex++;
          _this.setImageAndTitle(imageList[imageIndex].imageId, imageList[imageIndex].imageTitle);
          $left.show();
          if (imageIndex + 1 === imageList.length) {
            $right.hide();
          }
        })
        .on('click', '.image-preview-main-area', function() {
          _this.$emit('showImagePanel', imagePanelData);
        });
    }
  }
};
</script>
