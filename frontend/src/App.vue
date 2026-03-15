<script setup lang="ts">
import OToastManager from '@/components/odoo/OToastManager.vue'
import OConfirmOverlay from '@/components/odoo/OConfirmOverlay.vue'
</script>

<template>
  <OToastManager />
  <OConfirmOverlay />
  <router-view />
</template>
