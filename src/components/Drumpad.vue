<script setup lang="ts">
import { ref } from 'vue'
import type { DrumSound } from '@/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  showHeader?: boolean
}>(), {
  showHeader: true,
})

const emit = defineEmits<{
  trigger: [sound: DrumSound]
}>()

const activePads = ref<Set<string>>(new Set())

const pads: { key: string; sound: DrumSound; label: string }[] = [
  { key: '1', sound: 'kick', label: 'KICK' },
  { key: '2', sound: 'snare', label: 'SNARE' },
  { key: '3', sound: 'hihat-closed', label: 'HH-C' },
  { key: '4', sound: 'hihat-open', label: 'HH-O' },
  { key: '5', sound: 'tom-high', label: 'TOM-H' },
  { key: '6', sound: 'tom-mid', label: 'TOM-M' },
  { key: '7', sound: 'tom-low', label: 'TOM-L' },
  { key: '8', sound: 'clap', label: 'CLAP' },
  { key: '9', sound: 'rim', label: 'RIM' },
  { key: '0', sound: 'crash', label: 'CRASH' },
]

function triggerPad(sound: DrumSound, key: string, e?: Event) {
  e?.preventDefault()
  emit('trigger', sound)
  activePads.value.add(key)
  setTimeout(() => activePads.value.delete(key), 100)
}

function handleKeyTrigger(key: string) {
  const pad = pads.find((p) => p.key === key)
  if (pad) {
    activePads.value.add(key)
    setTimeout(() => activePads.value.delete(key), 100)
  }
}

defineExpose({ handleKeyTrigger })
</script>

<template>
  <div :class="props.showHeader ? 'p-4' : 'px-4 pb-4 pt-2'">
    <h3
      v-if="props.showHeader"
      class="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider"
    >
      Drum Pad
    </h3>
    <div class="grid grid-cols-5 gap-2">
      <Button
        v-for="pad in pads"
        :key="pad.key"
        :variant="activePads.has(pad.key) ? 'default' : 'secondary'"
        :class="cn(
          'aspect-square h-auto min-h-[48px] sm:min-h-[56px] flex flex-col items-center justify-center p-2 transition-all duration-75',
          activePads.has(pad.key) && 'scale-95 ring-2 ring-primary'
        )"
        @mousedown="triggerPad(pad.sound, pad.key, $event)"
        @touchstart="triggerPad(pad.sound, pad.key, $event)"
      >
        <span class="text-lg font-bold text-primary">{{ pad.key }}</span>
        <span class="text-[10px] text-muted-foreground mt-0.5">{{ pad.label }}</span>
      </Button>
    </div>
  </div>
</template>
