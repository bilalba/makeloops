<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLooperStore } from '@/stores/looperStore'
import { useAudioStore } from '@/stores/audioStore'
import { useGridStore } from '@/stores/gridStore'
import LoopTrack from './LoopTrack.vue'
import * as Tone from 'tone'
import audioEngine from '@/audio/AudioEngine'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Play, Pause, Square, Trash2, Download } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const looperStore = useLooperStore()
const audioStore = useAudioStore()
const gridStore = useGridStore()

// Responsive width for track controls panel (matches LoopTrack)
const TRACK_CONTROLS_WIDTH = 'clamp(120px, 32vw, 180px)'

// Edit confirmation dialog state
const showEditConfirm = ref(false)
const pendingEditLayerId = ref<string | null>(null)

function handleEditLayer(layerId: string) {
  // Check if grid has content
  if (gridStore.hasContent) {
    pendingEditLayerId.value = layerId
    showEditConfirm.value = true
  } else {
    executeEdit(layerId)
  }
}

function executeEdit(layerId: string) {
  const layer = looperStore.layers.find(l => l.id === layerId)
  if (!layer) return

  // Get the effective duration (1 bar for grid)
  const effectiveDuration = layer.cropEnd - layer.cropStart

  // Find the actual content range (where events actually exist)
  const noteOnEvents = layer.events.filter(e => e.type === 'noteOn')
  if (noteOnEvents.length === 0) {
    return
  }

  // Normalize events relative to cropStart + startPadding
  // This preserves original beat positions and handles padding from extensions
  const offset = layer.cropStart + layer.startPadding
  const normalizedEvents = layer.events
    .filter(e => e.time >= layer.cropStart && e.time < layer.cropEnd)
    .map(e => ({ ...e, time: e.time - offset }))

  // Load events into grid (this will clear the grid first)
  gridStore.loadFromMidiEvents(normalizedEvents, layer.instrumentId, effectiveDuration)
}

function handleEditConfirm() {
  const layerId = pendingEditLayerId.value
  pendingEditLayerId.value = null
  showEditConfirm.value = false
  if (layerId) {
    executeEdit(layerId)
  }
}

function handleEditCancel() {
  pendingEditLayerId.value = null
  showEditConfirm.value = false
}

// Export WAV
const isExporting = ref(false)

async function handleExportWav() {
  if (isExporting.value || looperStore.layers.length === 0) return

  isExporting.value = true

  try {
    console.log('Export: starting...')

    // Calculate loop duration in seconds
    const durationTicks = looperStore.timelineDuration
    const durationSeconds = audioEngine.ticksToSeconds(durationTicks)
    console.log('Export: duration =', durationSeconds)

    // Stop if currently playing and reset
    handleStop()
    console.log('Export: stopped')

    // Small delay to ensure clean state
    await new Promise(resolve => setTimeout(resolve, 50))
    console.log('Export: delay done')

    // Ensure audio context is running (required for recorder)
    await audioEngine.init()
    console.log('Export: audio context ready, state =', Tone.getContext().state)

    // Force resume if suspended
    if (Tone.getContext().state === 'suspended') {
      await Tone.getContext().resume()
      console.log('Export: context resumed')
    }

    // Reset transport position to exactly 0 before anything else
    audioEngine.setPosition(0)

    // Start recording
    console.log('Export: about to start recording, recorder state =', audioEngine.recorder.state)
    audioEngine.recorder.start()
    console.log('Export: recorder.start() called')

    // Use scheduled start to ensure transport begins after recorder is ready
    // This gives the Web Audio scheduler time to queue up events at position 0
    const startDelay = 0.15 // seconds
    console.log('Export: about to play with scheduled start')
    audioStore.play(`+${startDelay}`)
    console.log('Export: play() called with delay, isPlaying =', audioStore.isPlaying)

    // Wait for start delay + one full loop cycle + buffer
    await new Promise(resolve => setTimeout(resolve, (startDelay + durationSeconds) * 1000 + 300))
    console.log('Export: wait done')

    // Stop playback
    handleStop()
    console.log('Export: stopped playback')

    // Stop recording and get blob
    const blob = await audioEngine.stopRecording()
    console.log('Export: got blob, size =', blob.size)

    if (blob.size > 0) {
      // Download the file
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `loop-${Date.now()}.wav`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  } catch (error) {
    console.error('Export failed:', error)
  } finally {
    isExporting.value = false
  }
}

function handlePlay() {
  if (audioStore.isPlaying) {
    audioStore.stop()
  } else {
    audioStore.play()
  }
}

function handleStop() {
  if (looperStore.isRecording) {
    looperStore.stopRecording()
  }
  audioStore.stop()
}

const timelineDuration = computed(() => looperStore.timelineDuration)

const measureCount = computed(() => {
  if (!timelineDuration.value) return 0
  const measureTicks = Tone.Time('1m').toTicks()
  return Math.ceil(timelineDuration.value / measureTicks)
})

function getAxisStep(totalSeconds: number): number {
  if (totalSeconds <= 4) return 0.5
  if (totalSeconds <= 8) return 1
  if (totalSeconds <= 16) return 2
  if (totalSeconds <= 32) return 4
  return 8
}

const axisMarkers = computed(() => {
  if (!timelineDuration.value) return []
  const totalSeconds = audioEngine.ticksToSeconds(timelineDuration.value)
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return []

  const stepSeconds = getAxisStep(totalSeconds)
  const markers: Array<{ left: number; label: string; ticks: number }> = []

  const labelDecimals = stepSeconds < 1 ? 1 : 0
  const total = Math.max(0, totalSeconds)

  for (let sec = 0; sec <= total + 1e-6; sec += stepSeconds) {
    const left = (sec / total) * 100
    const ticks = Math.round(audioEngine.secondsToTicks(sec))
    markers.push({
      left,
      label: `${sec.toFixed(labelDecimals)}s`,
      ticks,
    })
  }

  return markers
})
</script>

<template>
  <Card class="bg-card/50 border-border">
    <CardHeader class="pb-4">
      <div class="flex items-center justify-between">
        <CardTitle class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Looper
        </CardTitle>
        <Badge v-if="measureCount > 0" variant="secondary" class="text-xs">
          {{ measureCount }} {{ measureCount === 1 ? 'bar' : 'bars' }}
        </Badge>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- Play/Stop Controls -->
      <div class="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          :class="cn(
            'h-12 w-12 rounded-full border-2 transition-all',
            audioStore.isPlaying
              ? 'bg-green-600 border-green-500 text-white hover:bg-green-700'
              : 'border-green-600/50 text-green-500 hover:bg-green-600/10 hover:border-green-500'
          )"
          @click="handlePlay"
          title="Play/Pause (Space)"
        >
          <Play v-if="!audioStore.isPlaying" class="h-5 w-5" />
          <Pause v-else class="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          class="h-12 w-12 rounded-full border-2 border-muted-foreground/50 text-muted-foreground hover:bg-muted hover:border-muted-foreground"
          @click="handleStop"
          title="Stop"
        >
          <Square class="h-5 w-5 fill-current" />
        </Button>
      </div>

      <!-- Timeline Header (aligned with track waveforms) -->
      <div v-if="axisMarkers.length" class="flex">
        <!-- Spacer for track controls -->
        <div class="flex-shrink-0" :style="{ width: TRACK_CONTROLS_WIDTH }" />
        <!-- Timeline ruler -->
        <div class="flex-1 relative h-7">
          <div class="absolute top-3 left-0 right-0 h-px bg-border" />
          <div
            v-for="(marker, index) in axisMarkers"
            :key="index"
            class="absolute top-1.5 -translate-x-1/2 flex flex-col items-center gap-1"
            :style="{ left: `${marker.left}%` }"
          >
            <div class="w-px h-2.5 bg-muted-foreground/50" />
            <span class="text-[10px] text-muted-foreground" :title="`${marker.ticks} ticks`">
              {{ marker.label }}
            </span>
          </div>
        </div>
      </div>

      <!-- Layers List (DAW-style continuous container) -->
      <div class="min-h-[8rem]">
        <div v-if="looperStore.layers.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
          <p class="text-muted-foreground text-sm">No loops recorded yet</p>
          <p class="text-muted-foreground/60 text-xs mt-1">
            Press the record button and play to create a loop
          </p>
        </div>

        <!-- Joined track container -->
        <div v-else class="rounded-lg border border-border overflow-hidden">
          <LoopTrack
            v-for="(layer, index) in looperStore.layers"
            :key="layer.id"
            :layer="layer"
            :is-first="index === 0"
            :is-last="index === looperStore.layers.length - 1"
            :track-controls-width="TRACK_CONTROLS_WIDTH"
            @edit-layer="handleEditLayer"
          />
        </div>
      </div>

      <!-- Actions -->
      <div v-if="looperStore.layers.length > 0" class="flex justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="isExporting"
          @click="handleExportWav"
        >
          <Download class="h-4 w-4 mr-2" />
          {{ isExporting ? 'Exporting...' : 'Export WAV' }}
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground"
          @click="looperStore.clearAllLayers()"
        >
          <Trash2 class="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>
    </CardContent>
  </Card>

  <!-- Edit Confirmation Dialog -->
  <AlertDialog :open="showEditConfirm">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Clear Grid?</AlertDialogTitle>
        <AlertDialogDescription>
          This will clear your current grid pattern and load the loop for editing. Any unsaved changes to the grid will be lost.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleEditCancel">Cancel</AlertDialogCancel>
        <AlertDialogAction @click="handleEditConfirm">Clear & Edit</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
