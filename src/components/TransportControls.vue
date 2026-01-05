<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useAudioStore } from '@/stores/audioStore'
import { useLooperStore } from '@/stores/looperStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Circle } from 'lucide-vue-next'

const audioStore = useAudioStore()
const looperStore = useLooperStore()

const bpmInput = ref(audioStore.bpm)

let positionInterval: number | null = null

function startPositionUpdates() {
  if (positionInterval) return
  positionInterval = window.setInterval(() => {
    audioStore.updatePosition()
  }, 50)
}

function stopPositionUpdates() {
  if (positionInterval) {
    clearInterval(positionInterval)
    positionInterval = null
  }
}

watch(
  () => audioStore.isPlaying || audioStore.isRecording,
  (isActive) => {
    if (isActive) {
      startPositionUpdates()
    } else {
      stopPositionUpdates()
    }
  }
)

onUnmounted(() => {
  stopPositionUpdates()
})

function handleRecord() {
  if (looperStore.isRecording) {
    looperStore.stopRecording()
    audioStore.stopRecording()
  } else {
    audioStore.startRecording()
    looperStore.startRecording()
  }
}

function updateBpm() {
  const value = Math.min(300, Math.max(40, bpmInput.value))
  bpmInput.value = value
  audioStore.setBpm(value)
}
</script>

<template>
  <div class="flex items-center gap-6">
    <!-- Record Button -->
    <Button
      variant="outline"
      size="icon"
      :class="[
        'h-12 w-12 rounded-full border-2 transition-all',
        looperStore.isRecording
          ? 'bg-destructive border-destructive text-destructive-foreground animate-pulse'
          : 'border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive'
      ]"
      @click="handleRecord"
      title="Record (R)"
    >
      <Circle class="h-5 w-5 fill-current" />
    </Button>

    <!-- BPM Control -->
    <div class="flex items-center gap-3">
      <Label class="text-xs uppercase tracking-wider text-muted-foreground">BPM</Label>
      <Input
        type="number"
        v-model.number="bpmInput"
        @change="updateBpm"
        min="40"
        max="300"
        class="w-20 text-center bg-secondary/50 border-border"
      />
    </div>

    <!-- Position Display -->
    <div class="flex flex-col items-center">
      <span class="text-xs uppercase tracking-wider text-muted-foreground">Position</span>
      <span class="font-mono text-primary text-lg">{{ audioStore.position }}</span>
    </div>
  </div>
</template>
