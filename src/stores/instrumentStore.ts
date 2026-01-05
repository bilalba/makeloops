import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { InstrumentType } from '@/types'
import instrumentFactory from '@/audio/instruments/InstrumentFactory'

export const useInstrumentStore = defineStore('instrument', () => {
  const currentInstrument = ref<InstrumentType>('piano')
  const octave = ref(4)

  const isDrums = computed(() => currentInstrument.value === 'drums')

  function setInstrument(type: InstrumentType) {
    currentInstrument.value = type
  }

  function octaveUp() {
    if (octave.value < 7) {
      instrumentFactory.releaseAllNotes()
      octave.value++
    }
  }

  function octaveDown() {
    if (octave.value > 1) {
      instrumentFactory.releaseAllNotes()
      octave.value--
    }
  }

  function setOctave(value: number) {
    if (value >= 1 && value <= 7) {
      instrumentFactory.releaseAllNotes()
      octave.value = value
    }
  }

  function getNoteWithOctave(baseNote: string, octaveOffset: number = 0): string {
    return `${baseNote}${octave.value + octaveOffset}`
  }

  function getDrumKit() {
    return instrumentFactory.getDrumKit()
  }

  function getMelodicInstrument() {
    if (currentInstrument.value === 'drums') {
      return instrumentFactory.getMelodicInstrument('piano')
    }
    return instrumentFactory.getMelodicInstrument(currentInstrument.value)
  }

  return {
    currentInstrument,
    octave,
    isDrums,
    setInstrument,
    octaveUp,
    octaveDown,
    setOctave,
    getNoteWithOctave,
    getDrumKit,
    getMelodicInstrument,
  }
})
