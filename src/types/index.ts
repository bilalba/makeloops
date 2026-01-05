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
