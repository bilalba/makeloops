<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
  active: boolean
  velocity: number
  isCurrentStep: boolean
  isBeat: boolean // Every 4th step (beat marker)
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>

<template>
  <button
    type="button"
    :class="
      cn(
        'aspect-square border-r border-border/30 transition-all duration-75',
        'hover:bg-primary/20 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:ring-inset',
        isBeat && 'bg-muted/30',
        active && 'bg-primary hover:bg-primary/90',
        isCurrentStep && !active && 'bg-orange-500/20',
        isCurrentStep && active && 'ring-2 ring-inset ring-orange-400'
      )
    "
    :style="active ? { opacity: 0.5 + velocity * 0.5 } : {}"
    @click="emit('toggle')"
  />
</template>
