import { onUnmounted, ref, watch } from 'vue'
import audioEngine from '@/audio/AudioEngine'

type PlaybackCursorOptions = {
  effectiveDurationTicks: () => number
  isPlaying: () => boolean
}

export function usePlaybackCursor(options: PlaybackCursorOptions) {
  const cursorPosition = ref(0)
  let animationId: number | null = null

  const updateCursor = () => {
    const effectiveDuration = options.effectiveDurationTicks()

    if (effectiveDuration <= 0 || !options.isPlaying()) {
      cursorPosition.value = 0
      return
    }

    const globalTicks = audioEngine.getPositionTicks()
    const positionInLoop = globalTicks % effectiveDuration
    cursorPosition.value = (positionInLoop / effectiveDuration) * 100
  }

  const animate = () => {
    if (!options.isPlaying()) {
      cursorPosition.value = 0
      return
    }

    updateCursor()
    animationId = requestAnimationFrame(animate)
  }

  watch(
    () => options.isPlaying(),
    (playing) => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId)
        animationId = null
      }

      if (playing) {
        animationId = requestAnimationFrame(animate)
      } else {
        cursorPosition.value = 0
      }
    },
    { immediate: true }
  )

  watch(
    () => options.effectiveDurationTicks(),
    (duration) => {
      if (duration <= 0) {
        cursorPosition.value = 0
        return
      }

      if (options.isPlaying()) {
        updateCursor()
      }
    }
  )

  onUnmounted(() => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
    }
  })

  return { cursorPosition }
}
