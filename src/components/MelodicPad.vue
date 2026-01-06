<script setup lang="ts">
import { ref } from 'vue'
import { useInstrumentStore } from '@/stores/instrumentStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const instrumentStore = useInstrumentStore()

const emit = defineEmits<{
  noteOn: [note: string]
  noteOff: [note: string]
}>()

const activeKeys = ref<Set<string>>(new Set())

const topRowKeys = [
  { key: 'W', note: 'C#', octaveOffset: 0 },
  { key: 'E', note: 'D#', octaveOffset: 0 },
  { key: '', note: '', octaveOffset: 0 }, // spacer
  { key: 'T', note: 'F#', octaveOffset: 0 },
  { key: 'Y', note: 'G#', octaveOffset: 0 },
  { key: 'U', note: 'A#', octaveOffset: 0 },
  { key: '', note: '', octaveOffset: 0 }, // spacer
  { key: 'O', note: 'C#', octaveOffset: 1 },
  { key: 'P', note: 'D#', octaveOffset: 1 },
]

const bottomRowKeys = [
  { key: 'A', note: 'C', octaveOffset: 0 },
  { key: 'S', note: 'D', octaveOffset: 0 },
  { key: 'D', note: 'E', octaveOffset: 0 },
  { key: 'F', note: 'F', octaveOffset: 0 },
  { key: 'G', note: 'G', octaveOffset: 0 },
  { key: 'H', note: 'A', octaveOffset: 0 },
  { key: 'J', note: 'B', octaveOffset: 0 },
  { key: 'K', note: 'C', octaveOffset: 1 },
  { key: 'L', note: 'D', octaveOffset: 1 },
  { key: ';', note: 'E', octaveOffset: 1 },
]

function getFullNote(note: string, octaveOffset: number): string {
  return `${note}${instrumentStore.octave + octaveOffset}`
}

function handleMouseDown(key: string, note: string, octaveOffset: number, e?: Event) {
  if (!note) return
  e?.preventDefault()
  const fullNote = getFullNote(note, octaveOffset)
  activeKeys.value.add(key)
  emit('noteOn', fullNote)
}

function handleMouseUp(key: string, note: string, octaveOffset: number, e?: Event) {
  if (!note) return
  e?.preventDefault()
  const fullNote = getFullNote(note, octaveOffset)
  activeKeys.value.delete(key)
  emit('noteOff', fullNote)
}

function handleMouseLeave(key: string, note: string, octaveOffset: number) {
  if (activeKeys.value.has(key)) {
    handleMouseUp(key, note, octaveOffset)
  }
}

function handleKeyPress(key: string, isDown: boolean) {
  if (isDown) {
    activeKeys.value.add(key.toUpperCase())
  } else {
    activeKeys.value.delete(key.toUpperCase())
  }
}

defineExpose({ handleKeyPress })
</script>

<template>
  <div class="p-4">
    <h3 class="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
      Melodic Pad
    </h3>

    <!-- Top row - sharps/flats (black keys) -->
    <div class="flex justify-center gap-1 mb-1 ml-6">
      <template v-for="(item, i) in topRowKeys" :key="i">
        <div v-if="!item.key" class="w-12"></div>
        <Button
          v-else
          :variant="activeKeys.has(item.key) ? 'default' : 'outline'"
          :class="cn(
            'w-12 h-12 flex flex-col items-center justify-center p-1 transition-all duration-75',
            'bg-secondary/80 hover:bg-secondary border-border',
            activeKeys.has(item.key) && 'scale-95 bg-purple-600 border-purple-400 text-white'
          )"
          @mousedown="handleMouseDown(item.key, item.note, item.octaveOffset, $event)"
          @mouseup="handleMouseUp(item.key, item.note, item.octaveOffset, $event)"
          @mouseleave="handleMouseLeave(item.key, item.note, item.octaveOffset)"
          @touchstart="handleMouseDown(item.key, item.note, item.octaveOffset, $event)"
          @touchend="handleMouseUp(item.key, item.note, item.octaveOffset, $event)"
        >
          <span class="text-sm font-bold">{{ item.key }}</span>
          <span class="text-[10px] opacity-70">{{ item.note }}</span>
        </Button>
      </template>
    </div>

    <!-- Bottom row - naturals (white keys) -->
    <div class="flex justify-center gap-1">
      <Button
        v-for="item in bottomRowKeys"
        :key="item.key"
        :variant="activeKeys.has(item.key) ? 'default' : 'outline'"
        :class="cn(
          'w-12 h-16 flex flex-col items-center justify-center p-1 transition-all duration-75',
          'bg-card hover:bg-card/80 border-border text-foreground',
          activeKeys.has(item.key) && 'scale-95 bg-primary border-primary text-primary-foreground'
        )"
        @mousedown="handleMouseDown(item.key, item.note, item.octaveOffset, $event)"
        @mouseup="handleMouseUp(item.key, item.note, item.octaveOffset, $event)"
        @mouseleave="handleMouseLeave(item.key, item.note, item.octaveOffset)"
        @touchstart="handleMouseDown(item.key, item.note, item.octaveOffset, $event)"
        @touchend="handleMouseUp(item.key, item.note, item.octaveOffset, $event)"
      >
        <span class="text-sm font-bold">{{ item.key }}</span>
        <span class="text-[10px] opacity-70">{{ item.note }}</span>
      </Button>
    </div>
  </div>
</template>
