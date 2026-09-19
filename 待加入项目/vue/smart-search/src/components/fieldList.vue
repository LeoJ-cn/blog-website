<template>
    <div
      class="field-list-conatiner" 
      @mouseleave="clearFieldList">
        <p v-for="(item, index) in fieldList"
          :key="index"
          @click="selectField(item)">{{item}}</p>
    </div>
</template>

<script>
import $ from 'jquery';
import {
  CLASS_NAME_FIELD_TO_BE_FIXED,
  SELECTOR_FIELD_TO_BE_FIXED
} from '../constants';

export default {
  props: {
    fieldList: {
      type: Array
    }
  },
  methods: {
    selectField(item) {
      $(SELECTOR_FIELD_TO_BE_FIXED)
        .text(item)
        .removeClass('error');
      this.clearFieldList();
    },
    clearFieldList() {
      $(SELECTOR_FIELD_TO_BE_FIXED)
        .removeClass(CLASS_NAME_FIELD_TO_BE_FIXED);
      this.$emit('select-field');
    }
  }
};
</script>

<style lang="scss" scoped>
.field-list-conatiner{
    max-height: 250px;
    position: absolute;
    background: #fff;
    border: 1px solid #eee;
    box-shadow: rgba(0, 0, 0, 0.3) 3px 3px 10px;
    border-radius: 4px;
    overflow-y: auto;
    font-size: 14px;
    z-index: 104;
    p{
        padding: 0 20px;
        height: 32px;
        line-height: 32px;
        margin: 0;
        cursor: pointer;
        &:hover{
            background: #fafafa
        }
    }
}
</style>


