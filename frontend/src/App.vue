<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'
</script>

<template>
  <ConfirmDialog />
  <router-view />
  <Toaster />
</template>
