import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as Tone from 'tone'
import type {
  GridMode,
  GridPattern,
  RootNote,
  ScaleName,
  InstrumentType,
  MidiEvent,
  LoopLayer,
  DrumSound,
} from '@/types'
import { getScaleNotesForGrid, SCALE_DEFINITIONS } from '@/utils/scales'
import { instrumentFactory } from '@/audio/instruments/InstrumentFactory'
import { useLooperStore } from './looperStore'

// Drum row configuration (bottom to top for grid display)
const DRUM_ROWS: { sound: DrumSound; label: string }[] = [
  { sound: 'kick', label: 'Kick' },
  { sound: 'snare', label: 'Snare' },
  { sound: 'hihat-closed', label: 'HH Cls' },
  { sound: 'hihat-open', label: 'HH Opn' },
  { sound: 'clap', label: 'Clap' },
  { sound: 'rim', label: 'Rim' },
  { sound: 'tom-low', label: 'Tom L' },
  { sound: 'tom-mid', label: 'Tom M' },
  { sound: 'tom-high', label: 'Tom H' },
  { sound: 'crash', label: 'Crash' },
]

let gridLayerCounter = 0

function generateGridLayerId(): string {
  return `grid-${++gridLayerCounter}`
}

export const useGridStore = defineStore('grid', () => {
  // State
  const mode = ref<GridMode>('drums')
  const rootNote = ref<RootNote>('C')
  const scaleName = ref<ScaleName>('major')
  const octave = ref(4)
  const stepCount = ref(16)
  const pattern = ref<GridPattern>(createEmptyPattern(DRUM_ROWS.length, 16))
  const currentStep = ref(-1)
  const isPlaying = ref(false)
  const noteDensity = ref(0.3)
  const melodicInstrument = ref<Exclude<InstrumentType, 'drums'>>('piano')

  // Separate pattern storage for each mode (preserved when switching)
  let drumsPattern: GridPattern = createEmptyPattern(DRUM_ROWS.length, 16)
  // Key: scaleName, stores pattern for each scale
  const melodicPatterns: Map<ScaleName, GridPattern> = new Map()

  // Tone.js sequence for preview
  let sequence: Tone.Sequence | null = null

  // Computed
  const rowCount = computed(() => {
    if (mode.value === 'drums') {
      return DRUM_ROWS.length
    }
    return SCALE_DEFINITIONS[scaleName.value].intervals.length
  })

  const rowLabels = computed(() => {
    if (mode.value === 'drums') {
      return DRUM_ROWS.map((d) => d.label)
    }
    const notes = getScaleNotesForGrid(rootNote.value, scaleName.value, octave.value)
    return notes.map((n) => n.replace(/\d+$/, '')) // Remove octave for display
  })

  const rowNotes = computed(() => {
    if (mode.value === 'drums') {
      return DRUM_ROWS.map((d) => d.sound)
    }
    return getScaleNotesForGrid(rootNote.value, scaleName.value, octave.value)
  })

  // Functions
  function createEmptyPattern(rows: number, steps: number): GridPattern {
    return Array.from({ length: rows }, () =>
      Array.from({ length: steps }, () => ({ active: false, velocity: 0.8 }))
    )
  }

  function toggleCell(row: number, step: number) {
    if (pattern.value[row] && pattern.value[row][step]) {
      pattern.value[row][step].active = !pattern.value[row][step].active
    }
  }

  function setCellVelocity(row: number, step: number, velocity: number) {
    if (pattern.value[row] && pattern.value[row][step]) {
      pattern.value[row][step].velocity = Math.max(0, Math.min(1, velocity))
    }
  }

  function clearPattern() {
    pattern.value = createEmptyPattern(rowCount.value, stepCount.value)
    // Also clear the saved pattern for current mode
    if (mode.value === 'drums') {
      drumsPattern = createEmptyPattern(DRUM_ROWS.length, stepCount.value)
    } else {
      melodicPatterns.delete(scaleName.value)
    }
  }

  function randomizePattern() {
    const newPattern = createEmptyPattern(rowCount.value, stepCount.value)
    for (let row = 0; row < rowCount.value; row++) {
      for (let step = 0; step < stepCount.value; step++) {
        if (Math.random() < noteDensity.value) {
          const cell = newPattern[row]?.[step]
          if (cell) {
            cell.active = true
            cell.velocity = 0.6 + Math.random() * 0.4 // 0.6-1.0
          }
        }
      }
    }
    pattern.value = newPattern
  }

  function setMode(newMode: GridMode) {
    if (newMode === mode.value) return

    // Save current pattern before switching
    if (mode.value === 'drums') {
      drumsPattern = JSON.parse(JSON.stringify(pattern.value))
    } else {
      melodicPatterns.set(scaleName.value, JSON.parse(JSON.stringify(pattern.value)))
    }

    mode.value = newMode

    // Restore pattern for new mode (or create empty)
    if (newMode === 'drums') {
      pattern.value = JSON.parse(JSON.stringify(drumsPattern))
    } else {
      const savedMelodicPattern = melodicPatterns.get(scaleName.value)
      if (savedMelodicPattern) {
        pattern.value = JSON.parse(JSON.stringify(savedMelodicPattern))
      } else {
        pattern.value = createEmptyPattern(
          SCALE_DEFINITIONS[scaleName.value].intervals.length,
          stepCount.value
        )
      }
    }
    // Playback continues uninterrupted - playStep handles both patterns
  }

  function setScale(newScale: ScaleName) {
    if (newScale === scaleName.value) return

    // Save current melodic pattern before switching scales
    if (mode.value === 'melodic') {
      melodicPatterns.set(scaleName.value, JSON.parse(JSON.stringify(pattern.value)))
    }

    scaleName.value = newScale

    // Restore pattern for new scale (or create empty) if in melodic mode
    if (mode.value === 'melodic') {
      const savedPattern = melodicPatterns.get(newScale)
      if (savedPattern) {
        pattern.value = JSON.parse(JSON.stringify(savedPattern))
      } else {
        pattern.value = createEmptyPattern(
          SCALE_DEFINITIONS[newScale].intervals.length,
          stepCount.value
        )
      }
    }
    // Playback continues uninterrupted
  }

  function setRootNote(note: RootNote) {
    rootNote.value = note
  }

  function setOctave(oct: number) {
    octave.value = Math.max(2, Math.min(6, oct))
  }

  function setMelodicInstrument(inst: Exclude<InstrumentType, 'drums'>) {
    melodicInstrument.value = inst
  }

  function setNoteDensity(density: number) {
    noteDensity.value = Math.max(0.1, Math.min(0.8, density))
  }

  // Playback - plays BOTH drums and melodic patterns simultaneously
  function playStep(step: number, time: number) {
    // Get the active patterns - use pattern.value for current mode, saved pattern for the other
    const activeDrumsPattern = mode.value === 'drums' ? pattern.value : drumsPattern
    const activeMelodicPattern = mode.value === 'melodic' ? pattern.value : melodicPatterns.get(scaleName.value)

    // Play drums pattern
    const drumNotes = DRUM_ROWS.map((d) => d.sound)
    for (let row = 0; row < activeDrumsPattern.length; row++) {
      const cell = activeDrumsPattern[row]?.[step]
      const note = drumNotes[row]
      if (cell?.active && note) {
        const drumKit = instrumentFactory.getDrumKit()
        drumKit.trigger(note as DrumSound, time, cell.velocity)
      }
    }

    // Play melodic pattern (for current scale)
    if (activeMelodicPattern) {
      const melodicNotes = getScaleNotesForGrid(rootNote.value, scaleName.value, octave.value)
      for (let row = 0; row < activeMelodicPattern.length; row++) {
        const cell = activeMelodicPattern[row]?.[step]
        const note = melodicNotes[row]
        if (cell?.active && note) {
          const synth = instrumentFactory.getMelodicInstrument(melodicInstrument.value)
          synth.triggerAttackRelease(note, '16n', time, cell.velocity)
        }
      }
    }
  }

  // Track whether loops were muted for this preview session
  let loopsMutedForPreview = false

  function startPreview(withLoops: boolean = false) {
    if (isPlaying.value) return

    const looperStore = useLooperStore()

    isPlaying.value = true
    currentStep.value = 0

    // Mute looper layers if previewing without loops
    if (!withLoops && looperStore.layers.length > 0) {
      looperStore.muteAllLayers()
      loopsMutedForPreview = true
    } else {
      loopsMutedForPreview = false
    }

    const steps = Array.from({ length: stepCount.value }, (_, i) => i)

    sequence = new Tone.Sequence(
      (time, step) => {
        currentStep.value = step
        playStep(step, time)
      },
      steps,
      '16n'
    )

    sequence.loop = true

    // Start transport if not already running, then start sequence
    if (Tone.getTransport().state !== 'started') {
      Tone.getTransport().start()
      sequence.start(0)
    } else {
      // Transport already running - start sequence immediately at current position
      sequence.start()
    }
  }

  function stopPreview() {
    if (!isPlaying.value) return

    const looperStore = useLooperStore()

    isPlaying.value = false
    currentStep.value = -1

    if (sequence) {
      sequence.stop()
      sequence.dispose()
      sequence = null
    }

    // Restore looper mute states if we muted them
    if (loopsMutedForPreview) {
      looperStore.restoreLayerMuteStates()
      loopsMutedForPreview = false
    }
  }

  // Convert grid to MidiEvents for looper integration
  function convertToMidiEvents(): MidiEvent[] {
    const events: MidiEvent[] = []
    const stepTicks = Tone.Time('16n').toTicks()
    const notes = rowNotes.value

    for (let step = 0; step < stepCount.value; step++) {
      for (let row = 0; row < pattern.value.length; row++) {
        const cell = pattern.value[row]?.[step]
        const note = notes[row]
        if (cell?.active && note) {
          const time = step * stepTicks

          events.push({
            type: 'noteOn',
            note,
            velocity: cell.velocity,
            time,
          })

          // Add noteOff for melodic instruments
          if (mode.value !== 'drums') {
            events.push({
              type: 'noteOff',
              note,
              velocity: 0,
              time: time + stepTicks - 1, // Just before next step
            })
          }
        }
      }
    }

    return events.sort((a, b) => a.time - b.time)
  }

  function getLoopDuration(): number {
    return Tone.Time('1m').toTicks() // 1 bar = 16 sixteenth notes at 4/4
  }

  function createLoopLayer(): LoopLayer | null {
    const events = convertToMidiEvents()
    if (events.length === 0) return null

    const instrumentType = mode.value === 'drums' ? 'drums' : melodicInstrument.value
    const instrumentName = instrumentType.charAt(0).toUpperCase() + instrumentType.slice(1)
    const duration = getLoopDuration()

    return {
      id: generateGridLayerId(),
      name: `${instrumentName} (Grid)`,
      events,
      duration,
      cropStart: 0,
      cropEnd: duration,
      instrumentId: instrumentType,
      volume: 0,
      muted: false,
      solo: false,
    }
  }

  // Note: mode/scale changes are handled directly in setMode/setScale
  // which preserve playback state

  return {
    // State
    mode,
    rootNote,
    scaleName,
    octave,
    stepCount,
    pattern,
    currentStep,
    isPlaying,
    noteDensity,
    melodicInstrument,
    // Computed
    rowCount,
    rowLabels,
    rowNotes,
    // Actions
    toggleCell,
    setCellVelocity,
    clearPattern,
    randomizePattern,
    setMode,
    setScale,
    setRootNote,
    setOctave,
    setMelodicInstrument,
    setNoteDensity,
    startPreview,
    stopPreview,
    convertToMidiEvents,
    getLoopDuration,
    createLoopLayer,
  }
})
