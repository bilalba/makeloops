import { onUnmounted, ref, watch } from 'vue'
import * as Tone from 'tone'
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

    // Use seconds for consistency with Tone.Part looping
    const effectiveDurationSeconds = audioEngine.ticksToSeconds(effectiveDuration)
    const globalSeconds = Tone.getTransport().seconds
    const positionInLoop = globalSeconds % effectiveDurationSeconds
    cursorPosition.value = (positionInLoop / effectiveDurationSeconds) * 100
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
