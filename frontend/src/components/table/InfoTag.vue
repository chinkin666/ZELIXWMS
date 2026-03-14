<template>
  <span class="info-tag" :class="{ 'info-tag--inline': !absolute }" :style="tagStyle">
    <slot>{{ content }}</slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  width?: number | string
  height?: number | string
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  borderRadius?: number | string
  borderWidth?: number | string
  content?: string | number
  absolute?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 45,
  height: 20,
  backgroundColor: '#fff3cd',
  borderColor: '#cecece',
  textColor: '#664d23',
  borderRadius: 2,
  borderWidth: 1,
  content: '',
  absolute: true,
})

const tagStyle = computed(() => {
  return {
    width: typeof props.width === 'number' ? `${props.width}px` : props.width,
    height: typeof props.height === 'number' ? `${props.height}px` : props.height,
    backgroundColor: props.backgroundColor,
    color: props.textColor,
    border: `${props.borderWidth}px solid ${props.borderColor}`,
    borderRadius: typeof props.borderRadius === 'number' ? `${props.borderRadius}px` : props.borderRadius,
  }
})
</script>

<style scoped>
.info-tag {
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  box-sizing: border-box;
  vertical-align: middle;
}

/* 絶対位置モード（デフォルト、数量タグ等用） / 绝对定位模式（默认，用于数量tag等） */
.info-tag {
  position: absolute;
  right: 0px;
  z-index: 1;
}

/* 内联模式（用于クール区分等） */
.info-tag--inline {
  position: relative;
  right: auto;
  bottom: auto;
  z-index: auto;
  margin-left: 4px;
}
</style>

