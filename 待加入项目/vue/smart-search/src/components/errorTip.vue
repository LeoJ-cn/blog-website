<i18n src="../locales/locales.json">
</i18n>
<template>
    <div class="error-tip-container" :style="errorData.pos">
        <span>{{$t(`smartSearch.errorCode.${errorData.errorCode}`)}}</span>
    </div>
</template>

<script>
export default {
  props: {
    errorData: {
      default: ()=>{
        return {};
      }
    }
  }
};
</script>

<style lang="scss" scoped>
$color-error: #c92239;

.error-tip-container {
    padding: 5px 10px;
    background: #fff;
    position: fixed;
    z-index: 202;
    box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.16);
    border-radius: 4px;
    margin-left: -26px;
    margin-bottom: -7px;
    white-space: nowrap;
    span {
        font-size: 14px;
        color: $color-error;
    }
    &:before{ 
            content: '';
            border-left: 9px solid transparent;
            border-right: 9px solid transparent;
            border-bottom: 9px solid #eee;
            position: absolute;
            top: -9px;
            left: 17px;
    }
    &:after{ 
            content: '';
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-bottom: 7px solid #fff;
            position: absolute;
            top: -7px;
            left: 19px;
    }
} 
</style>

