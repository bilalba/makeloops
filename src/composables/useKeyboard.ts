import { ref, onMounted, onUnmounted } from 'vue'
import type { DrumSound, DrumMap, NoteMap } from '@/types'

export const DRUM_MAP: DrumMap = {
  '1': 'kick',
  '2': 'snare',
  '3': 'hihat-closed',
  '4': 'hihat-open',
  '5': 'tom-high',
  '6': 'tom-mid',
  '7': 'tom-low',
  '8': 'clap',
  '9': 'rim',
  '0': 'crash',
}

//  layout - sharps on top row, naturals on bottom
export const MELODIC_TOP_ROW: NoteMap = {
  w: 'C#',
  e: 'D#',
  t: 'F#',
  y: 'G#',
  u: 'A#',
  o: 'C#', // +1 octave
  p: 'D#', // +1 octave
}

export const MELODIC_BOTTOM_ROW: NoteMap = {
  a: 'C',
  s: 'D',
  d: 'E',
  f: 'F',
  g: 'G',
  h: 'A',
  j: 'B',
  k: 'C', // +1 octave
  l: 'D', // +1 octave
  ';': 'E', // +1 octave
}

// Keys that represent +1 octave offset
export const OCTAVE_UP_KEYS = ['o', 'p', 'k', 'l', ';']

export function useKeyboard(options: {
  onDrumTrigger?: (sound: DrumSound) => void
  onNoteOn?: (note: string, octaveOffset: number) => void
  onNoteOff?: (note: string, octaveOffset: number) => void
  onOctaveUp?: () => void
  onOctaveDown?: () => void
}) {
  const pressedKeys = ref<Set<string>>(new Set())

  function handleKeyDown(e: KeyboardEvent) {
    // Ignore if in input field
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return
    }

    const key = e.key.toLowerCase()

    // Prevent repeat events
    if (pressedKeys.value.has(key)) return
    pressedKeys.value.add(key)

    // Octave controls
    if (key === 'z') {
      options.onOctaveDown?.()
      return
    }
    if (key === 'x') {
      options.onOctaveUp?.()
      return
    }

    // Drum triggers (number keys)
    if (DRUM_MAP[key]) {
      options.onDrumTrigger?.(DRUM_MAP[key])
      return
    }

    // Melodic notes - top row (sharps)
    if (MELODIC_TOP_ROW[key]) {
      const octaveOffset = OCTAVE_UP_KEYS.includes(key) ? 1 : 0
      options.onNoteOn?.(MELODIC_TOP_ROW[key], octaveOffset)
      return
    }

    // Melodic notes - bottom row (naturals)
    if (MELODIC_BOTTOM_ROW[key]) {
      const octaveOffset = OCTAVE_UP_KEYS.includes(key) ? 1 : 0
      options.onNoteOn?.(MELODIC_BOTTOM_ROW[key], octaveOffset)
      return
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    const key = e.key.toLowerCase()
    pressedKeys.value.delete(key)

    // Melodic notes - top row
    if (MELODIC_TOP_ROW[key]) {
      const octaveOffset = OCTAVE_UP_KEYS.includes(key) ? 1 : 0
      options.onNoteOff?.(MELODIC_TOP_ROW[key], octaveOffset)
      return
    }

    // Melodic notes - bottom row
    if (MELODIC_BOTTOM_ROW[key]) {
      const octaveOffset = OCTAVE_UP_KEYS.includes(key) ? 1 : 0
      options.onNoteOff?.(MELODIC_BOTTOM_ROW[key], octaveOffset)
      return
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  })

  return {
    pressedKeys,
  }
}
