<template>
  <div class="about">
    <h1>This is an about page</h1>
    <template v-if="loginType === 'username'">
      <label>Username</label>
      <input
        placeholder="Enter your username"
        v-model="username"
        key="username-input"
      />
    </template>
    <template v-else>
      <label>Email</label>
      <input
        placeholder="Enter your email address"
        v-model="email"
        key="email-input"
      />
    </template>
    <div>
      <hr />
      <button @click="changeType">changeType</button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
export default Vue.extend({
  data() {
    return {
      username: "",
      email: "",
      loginType: "username",
    };
  },
  methods: {
    changeType() {
      debugger;
      const zm = 1;
      const b = "4";
      const zmc = zm + b;
      console.log(zmc);
      this.loginType = this.loginType === "username" ? "email" : "username";
    },
  },
});
</script>
