<script setup lang="ts">
import { ref } from 'vue'

interface Toast {
  id: number
  message: string
  type: 'success' | 'danger' | 'warning' | 'info'
  duration: number
}

const toasts = ref<Toast[]>([])
let nextId = 0

function add(message: string, type: Toast['type'] = 'info', duration = 3000) {
  const id = nextId++
  toasts.value = [...toasts.value, { id, message, type, duration }]
}

function remove(id: number) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

defineExpose({ add })
</script>

<template>
  <Teleport to="body">
    <div class="o-toast-container">
      <OToast
        v-for="item in toasts"
        :key="item.id"
        :message="item.message"
        :type="item.type"
        :duration="item.duration"
        @close="remove(item.id)"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.o-toast-container {
  position: fixed;
  top: 60px;
  right: 1rem;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}
</style>
