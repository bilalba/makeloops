export interface MidiEvent {
  type: 'noteOn' | 'noteOff'
  note: string
  velocity: number
  time: number // Transport-relative ticks
}

export interface LoopLayer {
  id: string
  name: string
  events: MidiEvent[]
  duration: number // total recorded duration in ticks
  cropStart: number // crop start in ticks (0 = beginning)
  cropEnd: number // crop end in ticks (duration = full length)
  startPadding: number // ticks of silence added at start (can shrink this much from start)
  endPadding: number // ticks of silence added at end (can shrink this much from end)
  instrumentId: InstrumentType
  volume: number
  muted: boolean
  solo: boolean
}

export type InstrumentType = 'drums' | 'piano' | 'synth' | 'pluck' | 'fm' | 'am' | 'membrane'

export type DrumSound =
  | 'kick'
  | 'snare'
  | 'hihat-closed'
  | 'hihat-open'
  | 'tom-high'
  | 'tom-mid'
  | 'tom-low'
  | 'clap'
  | 'rim'
  | 'crash'

export interface DrumMap {
  [key: string]: DrumSound
}

export interface NoteMap {
  [key: string]: string // key -> note name (e.g., 'C4')
}

export type TransportState = 'stopped' | 'playing' | 'recording'

// Grid Sequencer Types
export type ScaleName =
  | 'major'
  | 'minor'
  | 'pentatonic-major'
  | 'pentatonic-minor'
  | 'blues'
  | 'dorian'
  | 'mixolydian'
  | 'chromatic'

export type RootNote = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'

export type GridMode = 'drums' | 'melodic'

export interface GridCell {
  active: boolean
  velocity: number // 0-1, defaults to 0.8
}

export type GridPattern = GridCell[][]
