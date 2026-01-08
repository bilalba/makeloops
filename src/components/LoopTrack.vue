<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LoopLayer } from '@/types'
import { useLooperStore } from '@/stores/looperStore'
import { useAudioStore } from '@/stores/audioStore'
import { usePlaybackCursor } from '@/composables/usePlaybackCursor'
import audioEngine from '@/audio/AudioEngine'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Piano, Waves, Guitar, Radio, Disc, Volume2, Drum, Music, Trash2 } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<{
  layer: LoopLayer
  isFirst?: boolean
  isLast?: boolean
  trackControlsWidth: number
}>()

const looperStore = useLooperStore()
const audioStore = useAudioStore()

const waveformRef = ref<HTMLElement | null>(null)
const isDragging = ref<'start' | 'end' | null>(null)
const activeOffsetPercent = ref(0)
const volumeValue = ref([props.layer.volume])

const instrumentIcons: Record<string, typeof Piano> = {
  drums: Drum,
  piano: Piano,
  synth: Waves,
  pluck: Guitar,
  fm: Radio,
  am: Disc,
  membrane: Volume2,
}

const InstrumentIcon = computed(() => instrumentIcons[props.layer.instrumentId] || Music)

const timelineDuration = computed(() => {
  return looperStore.timelineDuration || 0
})

const cropStartPercent = computed(() => {
  if (!timelineDuration.value) return 0
  return (props.layer.cropStart / timelineDuration.value) * 100
})

const effectiveDurationTicks = computed(() => {
  return Math.max(0, props.layer.cropEnd - props.layer.cropStart)
})

const effectiveWidthPercent = computed(() => {
  if (!timelineDuration.value) return 0
  return (effectiveDurationTicks.value / timelineDuration.value) * 100
})

const isTransportActive = computed(() => {
  return audioStore.isPlaying || audioStore.isRecording
})

const { cursorPosition } = usePlaybackCursor({
  effectiveDurationTicks: () => effectiveDurationTicks.value,
  isPlaying: () => isTransportActive.value,
})

const cursorLeftPercent = computed(() => {
  return Math.max(0, Math.min(100, cursorPosition.value))
})

// Drum sounds ordered from low (bottom) to high (top) for piano-roll style visualization
const drumLanes: Record<string, number> = {
  'kick': 0,
  'tom-low': 1,
  'tom-mid': 2,
  'tom-high': 3,
  'snare': 4,
  'clap': 5,
  'rim': 6,
  'hihat-closed': 7,
  'hihat-open': 8,
  'crash': 9,
}
const totalDrumLanes = 10

const isDrumLayer = computed(() => props.layer.instrumentId === 'drums')

// Event blocks with note duration (width based on noteOn->noteOff pairing)
const eventBlocks = computed(() => {
  if (!props.layer.events.length || !effectiveDurationTicks.value) return []

  const blocks: { left: number; width: number; note: string; top: number; height: number }[] = []
  const events = props.layer.events
  const cropStart = props.layer.cropStart
  const cropEnd = props.layer.cropEnd
  const duration = effectiveDurationTicks.value

  // For drums, use fixed narrow width and vertical positioning by drum type
  if (isDrumLayer.value) {
    const laneHeight = 100 / totalDrumLanes
    events
      .filter(e => e.type === 'noteOn' && e.time >= cropStart && e.time < cropEnd)
      .forEach((event) => {
        const leftTicks = event.time - cropStart
        const left = (leftTicks / duration) * 100
        const laneIndex = drumLanes[event.note] ?? 5 // default to middle if unknown
        // Invert: low drums at bottom (high top%), high drums at top (low top%)
        const top = (totalDrumLanes - 1 - laneIndex) * laneHeight + 2 // +2px padding
        const height = laneHeight - 2 // slight gap between lanes
        blocks.push({ left, width: 0.8, note: event.note, top, height })
      })
    return blocks
  }

  // For melodic instruments, use noteOn->noteOff pairing for width
  // Build a map of noteOn events to their corresponding noteOff times
  const noteOnTimes: Map<string, number[]> = new Map()

  // First pass: collect all noteOn events within crop range
  events.forEach((event) => {
    if (event.type === 'noteOn' && event.time >= cropStart && event.time < cropEnd) {
      const stack = noteOnTimes.get(event.note) || []
      stack.push(event.time)
      noteOnTimes.set(event.note, stack)
    }
  })

  // Second pass: pair noteOn with noteOff and create blocks
  const activeNotes: Map<string, number[]> = new Map()

  events
    .filter(e => e.time >= cropStart && e.time <= cropEnd)
    .sort((a, b) => a.time - b.time)
    .forEach((event) => {
      if (event.type === 'noteOn' && event.time >= cropStart && event.time < cropEnd) {
        const stack = activeNotes.get(event.note) || []
        stack.push(event.time)
        activeNotes.set(event.note, stack)
      } else if (event.type === 'noteOff') {
        const stack = activeNotes.get(event.note)
        if (stack && stack.length > 0) {
          const noteOnTime = stack.shift()!
          if (noteOnTime >= cropStart) {
            const noteOffTime = Math.min(event.time, cropEnd)
            const leftTicks = noteOnTime - cropStart
            const widthTicks = noteOffTime - noteOnTime

            const left = (leftTicks / duration) * 100
            // Minimum width of 1% for very short notes
            const width = Math.max(1, (widthTicks / duration) * 100)

            blocks.push({ left, width, note: event.note, top: 12.5, height: 75 })
          }
          activeNotes.set(event.note, stack)
        }
      }
    })

  // Handle notes that don't have a noteOff within the crop (extend to cropEnd)
  activeNotes.forEach((stack, note) => {
    stack.forEach((noteOnTime) => {
      if (noteOnTime >= cropStart && noteOnTime < cropEnd) {
        const leftTicks = noteOnTime - cropStart
        const widthTicks = cropEnd - noteOnTime

        const left = (leftTicks / duration) * 100
        const width = Math.max(1, (widthTicks / duration) * 100)

        blocks.push({ left, width, note, top: 12.5, height: 75 })
      }
    })
  })

  return blocks
})

function handleVolumeChange(value: number[] | undefined) {
  if (!value || value.length === 0) return
  volumeValue.value = value
  looperStore.setLayerVolume(props.layer.id, value[0]!)
}

function startDrag(edge: 'start' | 'end', event: MouseEvent) {
  event.preventDefault()
  isDragging.value = edge
  if (edge === 'end') {
    looperStore.freezeTimelineDuration()
  }
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
}

function handleDrag(event: MouseEvent) {
  if (!isDragging.value || !waveformRef.value) return

  const rect = waveformRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const baseDuration = timelineDuration.value || props.layer.duration
  if (!baseDuration) return

  const dragSlackPx = 40
  const minX = -dragSlackPx
  const maxX = rect.width + dragSlackPx
  const clampedX = Math.max(minX, Math.min(maxX, x))
  const percentWithinTimeline = (clampedX / rect.width) * 100
  const ticks = (percentWithinTimeline / 100) * baseDuration

  if (isDragging.value === 'start') {
    // Don't let start go past end - leave minimum 5% gap
    const minGap = Math.max(1, effectiveDurationTicks.value * 0.05)
    const maxStart = props.layer.cropEnd - minGap
    const newStart = Math.min(ticks, maxStart)
    looperStore.setCropPoints(props.layer.id, newStart, props.layer.cropEnd)
  } else {
    // Don't let end go before start - leave minimum 5% gap
    const minGap = Math.max(1, effectiveDurationTicks.value * 0.05)
    const minEnd = props.layer.cropStart + minGap
    const newEnd = Math.max(ticks, minEnd)
    looperStore.setCropPoints(props.layer.id, props.layer.cropStart, newEnd)
  }
}

function stopDrag() {
  isDragging.value = null
  looperStore.unfreezeTimelineDuration()
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

watch(
  () => [props.layer.cropStart, props.layer.cropEnd, timelineDuration.value],
  () => {
    const startOffset = cropStartPercent.value
    if (!Number.isFinite(startOffset) || startOffset <= 0) {
      activeOffsetPercent.value = 0
      return
    }

    activeOffsetPercent.value = startOffset
    requestAnimationFrame(() => {
      activeOffsetPercent.value = 0
    })
  }
)

watch(() => props.layer.volume, (newVolume) => {
  volumeValue.value = [newVolume]
})

function extendLayer() {
  looperStore.extendLayerDuration(props.layer.id, audioEngine.getMeasureTicks())
}
</script>

<template>
  <div
    :class="cn(
      'flex transition-all bg-secondary/30',
      layer.muted && 'opacity-50',
      layer.solo && 'bg-yellow-500/5',
      !isLast && 'border-b border-border/50'
    )"
  >
    <!-- Left Panel: Track Controls -->
    <div
      class="flex-shrink-0 flex flex-col justify-center gap-1.5 p-3 bg-card/50 border-r border-border/50"
      :style="{ width: `${trackControlsWidth}px` }"
    >
      <!-- Track Name Row -->
      <div class="flex items-center gap-2">
        <component :is="InstrumentIcon" class="h-4 w-4 text-primary flex-shrink-0" />
        <span class="text-sm text-foreground truncate flex-1">{{ layer.name }}</span>
        <Button
          variant="ghost"
          size="icon"
          class="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
          @click="looperStore.removeLayer(layer.id)"
          title="Delete Layer"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </Button>
      </div>

      <!-- Controls Row: M/S + Volume -->
      <div class="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          :class="cn(
            'h-5 w-5 p-0 text-[10px] font-bold',
            layer.muted && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
          )"
          @click="looperStore.toggleMute(layer.id)"
          title="Mute"
        >
          M
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :class="cn(
            'h-5 w-5 p-0 text-[10px] font-bold',
            layer.solo && 'bg-yellow-500 text-yellow-950 hover:bg-yellow-400'
          )"
          @click="looperStore.toggleSolo(layer.id)"
          title="Solo"
        >
          S
        </Button>
        <div class="flex-1 px-1">
          <Slider
            :model-value="volumeValue"
            :min="-20"
            :max="6"
            :step="1"
            class="w-full"
            @update:model-value="handleVolumeChange"
          />
        </div>
      </div>
    </div>

    <!-- Right Panel: Waveform/Timeline Area -->
    <div ref="waveformRef" class="flex-1 h-16 bg-muted/30 relative overflow-visible">
      <!-- Active loop region -->
      <div
        class="absolute top-0 left-0 h-full bg-primary/10 border-l-2 border-r-2 border-primary pointer-events-none z-[3] overflow-hidden transition-[left,width] duration-150"
        :style="{ width: `${effectiveWidthPercent}%`, left: `${activeOffsetPercent}%` }"
      >
        <!-- Event blocks showing note duration -->
        <div
          v-for="(block, i) in eventBlocks"
          :key="i"
          class="absolute bg-primary/60 rounded-sm z-[4] pointer-events-none"
          :style="{
            left: `${block.left}%`,
            width: `${block.width}%`,
            minWidth: '3px',
            top: `${block.top}%`,
            height: `${block.height}%`
          }"
        />

        <!-- Playback cursor -->
        <div
          v-if="isTransportActive"
          class="absolute top-0 w-0.5 h-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)] z-[5] pointer-events-none -translate-x-1/2"
          :style="{ left: `${cursorLeftPercent}%` }"
        />
      </div>

      <!-- Left crop handle -->
      <div
        :class="cn(
          'absolute top-0 w-3 h-full cursor-col-resize z-10 flex items-center justify-center -translate-x-1/2 group',
          isDragging === 'start' && 'cursor-grabbing'
        )"
        :style="{ left: 0 }"
        @mousedown="startDrag('start', $event)"
      >
        <div
          :class="cn(
            'w-1 h-full bg-primary rounded-sm transition-all',
            (isDragging === 'start') && 'bg-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]',
            'group-hover:bg-primary group-hover:shadow-[0_0_8px_rgba(99,102,241,0.5)]'
          )"
        />
      </div>

      <!-- Right crop handle -->
      <div
        :class="cn(
          'absolute top-0 w-3 h-full cursor-col-resize z-10 flex items-center justify-center -translate-x-1/2 group',
          isDragging === 'end' && 'cursor-grabbing'
        )"
        :style="{ left: `${effectiveWidthPercent}%` }"
        @mousedown="startDrag('end', $event)"
      >
        <div
          :class="cn(
            'w-1 h-full bg-primary rounded-sm transition-all',
            (isDragging === 'end') && 'bg-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]',
            'group-hover:bg-primary group-hover:shadow-[0_0_8px_rgba(99,102,241,0.5)]'
          )"
        />
      </div>

      <!-- Extend button -->
      <Button
        variant="secondary"
        size="sm"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] h-6 px-2 opacity-60 hover:opacity-100 z-20"
        @click="extendLayer"
        title="Extend loop by 1 bar"
      >
        +1 bar
      </Button>
    </div>
  </div>
</template>
