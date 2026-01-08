<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LoopLayer } from '@/types'
import { useLooperStore } from '@/stores/looperStore'
import { useAudioStore } from '@/stores/audioStore'
import { usePlaybackCursor } from '@/composables/usePlaybackCursor'
import audioEngine from '@/audio/AudioEngine'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Piano, Waves, Guitar, Radio, Disc, Volume2, Drum, Music, Trash2, Minus, Plus } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<{
  layer: LoopLayer
  isFirst?: boolean
  isLast?: boolean
  trackControlsWidth: number
}>()

const looperStore = useLooperStore()
const audioStore = useAudioStore()

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
        blocks.push({ left, width: 4.5, note: event.note, top, height })
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

watch(() => props.layer.volume, (newVolume) => {
  volumeValue.value = [newVolume]
})

const measureTicks = computed(() => audioEngine.getMeasureTicks())
const beatTicks = computed(() => measureTicks.value / 4) // 4 beats per measure
const sixteenthTicks = computed(() => beatTicks.value / 4) // 16th notes

// Generate grid marker positions as percentages across the timeline
// Three levels: measure (brightest), beat (medium), 16th note (faintest)
const beatMarkers = computed(() => {
  if (!timelineDuration.value || !sixteenthTicks.value) return []

  const markers: { position: number; level: 'measure' | 'beat' | 'sixteenth' }[] = []
  const totalSixteenths = Math.floor(timelineDuration.value / sixteenthTicks.value)

  for (let i = 0; i <= totalSixteenths; i++) {
    const tickPosition = i * sixteenthTicks.value
    const position = (tickPosition / timelineDuration.value) * 100

    let level: 'measure' | 'beat' | 'sixteenth'
    if (i % 16 === 0) {
      level = 'measure' // Every 16 sixteenths = 1 measure
    } else if (i % 4 === 0) {
      level = 'beat' // Every 4 sixteenths = 1 beat
    } else {
      level = 'sixteenth'
    }

    markers.push({ position, level })
  }

  return markers
})

// Can only shrink if we've extended (have padding to remove)
const canShrinkFromStart = computed(() => {
  return props.layer.startPadding >= measureTicks.value
})

const canShrinkFromEnd = computed(() => {
  return props.layer.endPadding >= measureTicks.value
})

function shrinkFromStart() {
  if (canShrinkFromStart.value) {
    looperStore.shrinkFromStart(props.layer.id, measureTicks.value)
  }
}

function extendFromStart() {
  looperStore.extendFromStart(props.layer.id, measureTicks.value)
}

function shrinkFromEnd() {
  if (canShrinkFromEnd.value) {
    looperStore.shrinkFromEnd(props.layer.id, measureTicks.value)
  }
}

function extendFromEnd() {
  looperStore.extendFromEnd(props.layer.id, measureTicks.value)
}
</script>

<template>
  <div
    :class="cn(
      'flex transition-all bg-secondary/30',
      layer.muted && 'opacity-50',
      layer.solo && 'bg-yellow-500/5',
      !isLast && 'border-b border-foreground/10'
    )"
  >
    <!-- Left Panel: Track Controls -->
    <div
      class="flex-shrink-0 flex flex-col justify-center gap-1.5 px-3 h-16 bg-card/50 border-r border-border/50"
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
    <div ref="waveformRef" class="flex-1 h-16 bg-black/40 relative overflow-visible">
      <!-- Grid markers: measure (brightest) > beat > 16th note (faintest) -->
      <div
        v-for="(marker, i) in beatMarkers"
        :key="`beat-${i}`"
        class="absolute top-0 h-full pointer-events-none z-[1]"
        :class="{
          'w-0.5 bg-foreground/25': marker.level === 'measure',
          'w-px bg-foreground/15': marker.level === 'beat',
          'w-px bg-foreground/6': marker.level === 'sixteenth'
        }"
        :style="{ left: `${marker.position}%` }"
      />

      <!-- Active loop region -->
      <div
        class="absolute top-0 left-0 h-full bg-primary/10 border-l-2 border-r-2 border-primary pointer-events-none z-[3] overflow-hidden"
        :style="{ width: `${effectiveWidthPercent}%` }"
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

      <!-- Left bar controls -->
      <div class="absolute left-1 top-1/2 -translate-y-1/2 flex gap-0.5 z-20">
        <Button
          variant="secondary"
          size="sm"
          :class="cn(
            'h-6 w-6 p-0 text-[10px]',
            !canShrinkFromStart && 'opacity-30 cursor-not-allowed'
          )"
          :disabled="!canShrinkFromStart"
          @click="shrinkFromStart"
          title="Shrink loop by 1 bar from start"
        >
          <Minus class="h-3 w-3" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          class="h-6 w-6 p-0 text-[10px]"
          @click="extendFromStart"
          title="Extend loop by 1 bar from start"
        >
          <Plus class="h-3 w-3" />
        </Button>
      </div>

      <!-- Right bar controls -->
      <div class="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 z-20">
        <Button
          variant="secondary"
          size="sm"
          :class="cn(
            'h-6 w-6 p-0 text-[10px]',
            !canShrinkFromEnd && 'opacity-30 cursor-not-allowed'
          )"
          :disabled="!canShrinkFromEnd"
          @click="shrinkFromEnd"
          title="Shrink loop by 1 bar from end"
        >
          <Minus class="h-3 w-3" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          class="h-6 w-6 p-0 text-[10px]"
          @click="extendFromEnd"
          title="Extend loop by 1 bar"
        >
          <Plus class="h-3 w-3" />
        </Button>
      </div>
    </div>
  </div>
</template>
