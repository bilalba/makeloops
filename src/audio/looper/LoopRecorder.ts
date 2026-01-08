import * as Tone from 'tone'
import type { MidiEvent, InstrumentType } from '@/types'

export interface RecordingSession {
  events: MidiEvent[]
  startTicks: number
  endTicks: number
  instrumentType: InstrumentType
}

// Drum sound names for detection
const DRUM_SOUNDS: Set<string> = new Set([
  'kick', 'snare', 'hihat-closed', 'hihat-open',
  'tom-high', 'tom-mid', 'tom-low', 'clap', 'rim', 'crash'
])

function isDrumSound(note: string): boolean {
  return DRUM_SOUNDS.has(note)
}

export class LoopRecorder {
  private drumEvents: MidiEvent[] = []
  private melodicEvents: MidiEvent[] = []
  private isRecording = false
  private startTicks = 0
  private loopOffsetTicks = 0
  private loopListener: (() => void) | null = null
  private melodicInstrumentType: InstrumentType = 'piano'

  // Track held notes even when not recording (for injecting when recording starts)
  private heldNotes: Map<string, number> = new Map() // note -> velocity

  private getAbsoluteTicks(): number {
    return Tone.getTransport().ticks + this.loopOffsetTicks
  }

  private handleTransportLoop(): void {
    const loopEndTicks = Tone.Time(Tone.getTransport().loopEnd).toTicks()
    if (Number.isFinite(loopEndTicks) && loopEndTicks > 0) {
      this.loopOffsetTicks += loopEndTicks
    }
  }

  startRecording(melodicInstrumentType: InstrumentType): void {
    this.drumEvents = []
    this.melodicEvents = []
    this.melodicInstrumentType = melodicInstrumentType
    this.isRecording = true

    // Start capturing immediately - boundaries are quantized on stop
    this.loopOffsetTicks = 0
    this.startTicks = this.getAbsoluteTicks()

    if (!this.loopListener) {
      this.loopListener = this.handleTransportLoop.bind(this)
    }
    Tone.getTransport().on('loop', this.loopListener)
  }

  stopRecording(): RecordingSession[] {
    if (!this.isRecording) return []

    this.isRecording = false
    const endTicks = this.getAbsoluteTicks()
    if (this.loopListener) {
      Tone.getTransport().off('loop', this.loopListener)
    }

    const sessions: RecordingSession[] = []

    // Use raw boundaries - no quantization, user can crop manually
    const start = this.startTicks
    const end = endTicks

    // Create drum session if there are drum events
    if (this.drumEvents.length > 0) {
      const normalizedDrumEvents = this.drumEvents.map(e => ({
        ...e,
        time: e.time - start,
      }))

      if (normalizedDrumEvents.length > 0) {
        sessions.push({
          events: normalizedDrumEvents,
          startTicks: 0,
          endTicks: end - start,
          instrumentType: 'drums',
        })
      }
    }

    // Create melodic session if there are melodic events
    if (this.melodicEvents.length > 0) {
      const normalizedMelodicEvents = this.melodicEvents.map(e => ({
        ...e,
        time: e.time - start,
      }))

      if (normalizedMelodicEvents.length > 0) {
        sessions.push({
          events: normalizedMelodicEvents,
          startTicks: 0,
          endTicks: end - start,
          instrumentType: this.melodicInstrumentType,
        })
      }
    }

    return sessions
  }

  recordNoteOn(note: string, velocity: number = 0.8): void {
    if (!this.isRecording) return

    const currentTicks = this.getAbsoluteTicks()

    // Only record if we're past the start point
    if (currentTicks >= this.startTicks) {
      const event: MidiEvent = {
        type: 'noteOn',
        note,
        velocity,
        time: currentTicks,
      }

      // Route to appropriate event list based on note type
      if (isDrumSound(note)) {
        this.drumEvents.push(event)
      } else {
        this.melodicEvents.push(event)
      }
    }
  }

  recordNoteOff(note: string): void {
    if (!this.isRecording) return

    const currentTicks = this.getAbsoluteTicks()

    if (currentTicks >= this.startTicks) {
      const event: MidiEvent = {
        type: 'noteOff',
        note,
        velocity: 0,
        time: currentTicks,
      }

      // Route to appropriate event list based on note type
      if (isDrumSound(note)) {
        this.drumEvents.push(event)
      } else {
        this.melodicEvents.push(event)
      }
    }
  }

  // Track note on even when not recording (for external held-note tracking)
  trackNoteOn(note: string, velocity: number): void {
    this.heldNotes.set(note, velocity)
  }

  // Track note off even when not recording
  trackNoteOff(note: string): void {
    this.heldNotes.delete(note)
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording
  }

  getStartTicks(): number {
    return this.startTicks
  }

  getEventCount(): number {
    return this.drumEvents.length + this.melodicEvents.length
  }

  clear(): void {
    this.drumEvents = []
    this.melodicEvents = []
    this.isRecording = false
    this.startTicks = 0
    this.loopOffsetTicks = 0
    if (this.loopListener) {
      Tone.getTransport().off('loop', this.loopListener)
    }
  }
}

export const loopRecorder = new LoopRecorder()
