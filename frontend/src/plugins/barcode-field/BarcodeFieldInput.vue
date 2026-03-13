<template>
  <el-input
    v-model="modelValue"
    :placeholder="placeholder"
    clearable
    @keydown.enter="$emit('scan', modelValue)"
  >
    <template #prefix>
      <el-icon><i class="el-icon-s-promotion" /></el-icon>
    </template>
  </el-input>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  placeholder?: string
}>(), {
  placeholder: 'バーコードをスキャン',
})

const modelValue = defineModel<string>({ default: '' })

defineEmits<{
  scan: [value: string]
}>()
</script>
