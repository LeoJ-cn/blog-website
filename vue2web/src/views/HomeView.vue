<template>
  <div class="home">
    <img
      alt="Vue logo"
      :style="{ 'font-size': '12px', width: '26px' }"
      src="../assets/logo.png"
    />
    <HelloWorld msg="vue2+vue3+Welcome to Your Vue.js + TypeScript App" />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import HelloWorld from "@/components/HelloWorld.vue"; // @ is an alias to /src

@Component({
  components: {
    HelloWorld,
  },
})
export default class HomeView extends Vue {}
</script>
