<template>
  <div class="about">
    <h1>This is an about page</h1>
  </div>
</template>

<script>
export default {
  data() {
    return {
      abc: "1",
    };
  },
  mounted() {
    debugger;
    this.abc += "hsj";
    console.log(2, this.abc);
  },
};
</script>
