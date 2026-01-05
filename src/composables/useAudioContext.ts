import { ref } from 'vue'
import audioEngine from '@/audio/AudioEngine'

export function useAudioContext() {
  const initialized = ref(false)
  const error = ref<string | null>(null)

  async function initAudio() {
    try {
      await audioEngine.init()
      initialized.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to initialize audio'
      console.error('Audio init error:', e)
    }
  }

  return {
    initialized,
    error,
    initAudio,
  }
}
