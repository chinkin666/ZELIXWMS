<script setup lang="ts">
/**
 * ページヘッダー / 页面头部
 *
 * ControlPanel の shadcn-vue 移行版。
 * ControlPanel 的 shadcn-vue 迁移版本。
 * 同じ props/slots API を維持し、ビューの変更を最小限に。
 * 保持相同的 props/slots API，最小化视图变更。
 */
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { cn } from '@/lib/utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, Upload } from 'lucide-vue-next'

const router = useRouter()
const currentRoute = useRoute()
const { t } = useI18n()

const props = defineProps<{
  title?: string
  breadcrumbs?: string[]
  showSearch?: boolean
  showCreate?: boolean
  showUpload?: boolean
  createLabel?: string
}>()

defineEmits<{
  'create': []
  'search': [query: string]
}>()

// パンくずリストの自動生成（ルート階層から）/ 从路由层级自动生成面包屑
const autoBreadcrumbs = computed<{ label: string; route?: string }[]>(() => {
  if (props.breadcrumbs && props.breadcrumbs.length > 0) {
    return props.breadcrumbs.map((crumb) => ({
      label: crumb,
      route: undefined,
    }))
  }

  const matched = currentRoute.matched
  const crumbs: { label: string; route?: string }[] = []

  for (let i = 0; i < matched.length; i++) {
    const record = matched[i]
    if (!record) continue
    const title = record.meta?.title as string | undefined
    if (!title) continue

    const isLast = i === matched.length - 1

    if (isLast) {
      crumbs.push({ label: props.title ?? title })
    } else {
      const redirectPath = typeof record.redirect === 'string'
        ? record.redirect
        : typeof record.redirect === 'object' && record.redirect && 'path' in record.redirect
          ? (record.redirect as { path: string }).path
          : undefined
      crumbs.push({ label: title, route: redirectPath })
    }
  }

  if (crumbs.length === 0 && props.title) {
    crumbs.push({ label: props.title })
  }

  return crumbs
})

function navigateBreadcrumb(route?: string) {
  if (route) router.push(route)
}
</script>

<template>
  <div
    :class="cn(
      'sticky top-0 z-10 border-b bg-background px-4 dark:bg-background',
    )"
  >
    <!-- 上段: パンくず + アクション / 上排: 面包屑 + 操作按钮 -->
    <div class="flex items-center justify-between min-h-[42px] py-1">
      <!-- パンくず / 面包屑 -->
      <Breadcrumb>
        <BreadcrumbList>
          <template v-for="(crumb, i) in autoBreadcrumbs" :key="i">
            <BreadcrumbItem>
              <BreadcrumbLink
                v-if="i < autoBreadcrumbs.length - 1 && crumb.route"
                class="cursor-pointer"
                @click.prevent="navigateBreadcrumb(crumb.route)"
              >
                {{ crumb.label }}
              </BreadcrumbLink>
              <span
                v-else-if="i < autoBreadcrumbs.length - 1"
                class="text-muted-foreground"
              >
                {{ crumb.label }}
              </span>
              <BreadcrumbPage v-else class="font-semibold">
                {{ crumb.label }}
              </BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator v-if="i < autoBreadcrumbs.length - 1" />
          </template>
        </BreadcrumbList>
      </Breadcrumb>

      <!-- 中央スロット / 中间插槽 -->
      <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <slot name="center" />
      </div>

      <!-- アクションボタン / 操作按钮 -->
      <div class="flex items-center gap-1.5 shrink-0">
        <slot name="actions">
          <Button
            v-if="showUpload"
            variant="outline"
            size="sm"
          >
            <Upload class="size-3.5" />
            {{ t('common.upload') }}
          </Button>
          <Button
            v-if="showCreate"
            size="sm"
            @click="$emit('create')"
          >
            <Plus class="size-3.5" />
            {{ createLabel || t('controlPanel.new') }}
          </Button>
        </slot>
      </div>
    </div>

    <!-- 検索バー / 搜索栏 -->
    <div v-if="showSearch !== false" class="pb-2">
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          :placeholder="t('common.search')"
          class="pl-8 h-8"
          @input="$emit('search', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <!-- デフォルトスロット / 默认插槽 -->
    <slot />
  </div>
</template>
