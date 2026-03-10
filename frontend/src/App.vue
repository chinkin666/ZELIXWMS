<script setup lang="ts">
import { elementTheme } from './theme/element'

const themeVars = elementTheme.cssVars
</script>

<template>
  <el-config-provider>
    <div class="app-shell" :style="themeVars">
      <router-view />
    </div>
  </el-config-provider>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
    'Noto Color Emoji';
  min-height: 100vh;
}

#app {
  width: 100%;
  min-height: 100vh;
}

.app-shell {
  min-height: 100vh;
}
</style>

