import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import audioEngine from '@/audio/AudioEngine'
import instrumentFactory from '@/audio/instruments/InstrumentFactory'
import type { TransportState } from '@/types'

export const useAudioStore = defineStore('audio', () => {
  const initialized = ref(false)
  const transportState = ref<TransportState>('stopped')
  const bpm = ref(120)
  const position = ref('0:0:0')

  const isPlaying = computed(() => transportState.value === 'playing')
  const isRecording = computed(() => transportState.value === 'recording')
  const isStopped = computed(() => transportState.value === 'stopped')

  async function init() {
    if (initialized.value) return
    await audioEngine.init()
    audioEngine.setBpm(bpm.value)
    initialized.value = true
  }

  function setBpm(value: number) {
    bpm.value = value
    audioEngine.setBpm(value)
  }

  function play() {
    audioEngine.start()
    transportState.value = 'playing'
  }

  function stop() {
    instrumentFactory.releaseAllNotes()
    audioEngine.stop()
    transportState.value = 'stopped'
    position.value = '0:0:0'
  }

  function startRecording() {
    transportState.value = 'recording'
    if (!isPlaying.value) {
      audioEngine.start()
    }
  }

  function stopRecording() {
    transportState.value = 'playing'
  }

  function updatePosition() {
    position.value = audioEngine.getPosition()
  }

  return {
    initialized,
    transportState,
    bpm,
    position,
    isPlaying,
    isRecording,
    isStopped,
    init,
    setBpm,
    play,
    stop,
    startRecording,
    stopRecording,
    updatePosition,
  }
})
