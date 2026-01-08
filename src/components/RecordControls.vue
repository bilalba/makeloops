<script setup lang="ts">
import { ref } from 'vue'
import * as Tone from 'tone'
import { useAudioStore } from '@/stores/audioStore'
import { useLooperStore } from '@/stores/looperStore'
import { Button } from '@/components/ui/button'
import { Circle, Square, ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const audioStore = useAudioStore()
const looperStore = useLooperStore()

const showDropdown = ref(false)
let loopsMutedForRecording = false
let autoStopEventId: number | null = null

function handleRecordClick() {
  if (looperStore.isRecording) {
    stopRecording()
  } else {
    // Start recording without looper playback
    startRecording(false)
  }
  showDropdown.value = false
}

function handleRecordWithLoops() {
  if (looperStore.isRecording) {
    stopRecording()
  } else {
    startRecording(true)
  }
  showDropdown.value = false
}

function startRecording(withLoops: boolean) {
  // Mute looper layers if recording without loops
  if (!withLoops && looperStore.layers.length > 0) {
    looperStore.muteAllLayers()
    loopsMutedForRecording = true
  } else {
    loopsMutedForRecording = false
  }

  audioStore.startRecording()
  looperStore.startRecording()

  // Auto-stop after 1 bar
  const oneBar = Tone.Time('1m').toSeconds()
  autoStopEventId = Tone.getTransport().schedule(() => {
    if (looperStore.isRecording) {
      stopRecording()
    }
  }, `+${oneBar}`)
}

function stopRecording() {
  // Clear auto-stop if it hasn't fired yet
  if (autoStopEventId !== null) {
    Tone.getTransport().clear(autoStopEventId)
    autoStopEventId = null
  }

  looperStore.stopRecording()
  audioStore.stop()

  // Restore looper mute states if we muted them
  if (loopsMutedForRecording) {
    looperStore.restoreLayerMuteStates()
    loopsMutedForRecording = false
  }
}

function toggleDropdown(e: MouseEvent) {
  e.stopPropagation()
  showDropdown.value = !showDropdown.value
}

// Close dropdown when clicking outside
function closeDropdown() {
  showDropdown.value = false
}
</script>

<template>
  <div class="relative">
    <div class="flex items-center">
      <!-- Main Record Button -->
      <Button
        variant="outline"
        size="icon"
        :class="
          cn(
            'h-12 w-12 rounded-full rounded-r-none border-2 transition-all',
            looperStore.isRecording
              ? 'bg-destructive border-destructive text-destructive-foreground animate-pulse'
              : 'border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive'
          )
        "
        @click="handleRecordClick"
        :title="looperStore.isRecording ? 'Stop Recording' : 'Record'"
      >
        <Square v-if="looperStore.isRecording" class="h-5 w-5 fill-current" />
        <Circle v-else class="h-5 w-5 fill-current" />
      </Button>

      <!-- Dropdown Toggle -->
      <Button
        variant="outline"
        size="icon"
        :class="
          cn(
            'h-12 w-6 rounded-full rounded-l-none border-2 border-l-0 transition-all',
            looperStore.isRecording
              ? 'bg-destructive border-destructive text-destructive-foreground'
              : 'border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive'
          )
        "
        @click="toggleDropdown"
        :disabled="looperStore.isRecording"
      >
        <ChevronDown class="h-3 w-3" />
      </Button>
    </div>

    <!-- Dropdown Menu -->
    <div
      v-if="showDropdown && !looperStore.isRecording"
      class="absolute top-full left-0 pt-1 z-50"
    >
      <div class="bg-card border border-border rounded-lg shadow-lg min-w-[180px]">
        <button
          class="w-full px-4 py-2 text-left text-sm hover:bg-secondary/50 rounded-t-lg flex items-center gap-2"
          @click="handleRecordClick"
        >
          <Circle class="h-3 w-3 fill-destructive text-destructive" />
          Record
        </button>
        <button
          class="w-full px-4 py-2 text-left text-sm hover:bg-secondary/50 rounded-b-lg flex items-center gap-2"
          @click="handleRecordWithLoops"
        >
          <Circle class="h-3 w-3 fill-destructive text-destructive" />
          Record with Loops
        </button>
      </div>
    </div>

    <!-- Click outside overlay to close -->
    <div
      v-if="showDropdown"
      class="fixed inset-0 z-40"
      @click="closeDropdown"
    />
  </div>
</template>
