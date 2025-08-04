<template>
  <div id="app">
    <nav>
      <router-link to="/">Z</router-link> |
      <router-link to="/about">M</router-link>
    </nav>
    <ul>
      <li v-for="i in 3" :key="i" is="HelloWorld" :msg="'msg_' + i" />
    </ul>
    <router-view />
  </div>
</template>

<script>
import HelloWorld from "./components/HelloWorld.vue";
export default {
  components: {
    HelloWorld,
  },
};
</script>

<style>
* {
  padding: 0;
  margin: 0;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

button {
  background: #4d5869;
}

button:hover {
  cursor: pointer;
  background: #42b983;
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
}

nav a.router-link-exact-active {
  color: #42b983;
}
</style>
