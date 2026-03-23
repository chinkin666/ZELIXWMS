<script setup lang="ts">
import OButton from './OButton.vue'

interface Props {
  title: string
  description?: string
  icon?: string
  actionLabel?: string
}

withDefaults(defineProps<Props>(), {
  icon: '📋',
})

defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="o-empty-state">
    <div class="o-empty-icon">{{ icon }}</div>
    <h3 class="o-empty-title">{{ title }}</h3>
    <p v-if="description" class="o-empty-description">{{ description }}</p>
    <Button v-if="actionLabel" variant="primary" @click="$emit('action')">
      {{ actionLabel }}
    </Button>
  </div>
</template>

<style scoped>
.o-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  max-width: 400px;
  margin: auto;
  text-align: center;
}

.o-empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  line-height: 1;
}

.o-empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--o-gray-700, #495057);
  margin: 0 0 0.5rem;
}

.o-empty-description {
  font-size: var(--o-font-size-small, 0.875rem);
  color: var(--o-gray-500, #adb5bd);
  margin: 0 0 1rem;
  line-height: 1.5;
}
</style>
