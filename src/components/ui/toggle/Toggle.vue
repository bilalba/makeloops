<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Toggle as ToggleRoot, type ToggleEmits, type ToggleProps, useForwardPropsEmits } from 'radix-vue'
import { type ToggleVariants, toggleVariants } from '.'
import { cn } from '@/lib/utils'

const props = defineProps<ToggleProps & {
  class?: HTMLAttributes['class']
  variant?: ToggleVariants['variant']
  size?: ToggleVariants['size']
}>()
const emits = defineEmits<ToggleEmits>()

const delegatedProps = useForwardPropsEmits(props, emits)
</script>

<template>
  <ToggleRoot
    v-bind="delegatedProps"
    :class="cn(toggleVariants({ variant, size }), props.class)"
  >
    <slot />
  </ToggleRoot>
</template>
