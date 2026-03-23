<template>
  <Button
    :class="classes"
    :type="type"
    :disabled="disabled"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info' | 'icon' | 'icon-danger'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  type: 'button',
  disabled: false,
})

const classes = computed(() => {
  if (props.variant === 'icon') return 'o-btn-icon'
  if (props.variant === 'icon-danger') return 'o-btn-icon o-btn-icon--danger'

  return [
    'o-btn',
    {
      'o-btn-primary': props.variant === 'primary',
      'o-btn-secondary': props.variant === 'secondary',
      'o-btn-danger': props.variant === 'danger',
      'o-btn-success': props.variant === 'success',
      'o-btn-warning': props.variant === 'warning',
      'o-btn-info': props.variant === 'info',
      'o-btn-sm': props.size === 'sm',
    },
  ]
})
</script>
