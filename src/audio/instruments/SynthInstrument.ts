import * as Tone from 'tone'
import audioEngine from '../AudioEngine'
import type { InstrumentType } from '@/types'

export class SynthInstrument {
  private synth: Tone.PolySynth
  public type: InstrumentType

  constructor(type: InstrumentType = 'synth') {
    this.type = type
    this.synth = this.createSynth(type)
    this.synth.connect(audioEngine.masterGain)
  }

  private createSynth(type: InstrumentType): Tone.PolySynth {
    const maxPolyphony = 16
    switch (type) {
      case 'piano':
        return new Tone.PolySynth(Tone.Synth, {
          maxPolyphony,
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 },
        })

      case 'synth':
        return new Tone.PolySynth(Tone.Synth, {
          maxPolyphony,
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
        })

      case 'pluck':
        return new Tone.PolySynth(Tone.Synth, {
          maxPolyphony,
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
        })

      case 'fm':
        return new Tone.PolySynth(Tone.FMSynth, {
          maxPolyphony,
          harmonicity: 3,
          modulationIndex: 10,
          envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.5 },
          modulation: { type: 'sine' },
          modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 },
        })

      case 'am':
        return new Tone.PolySynth(Tone.AMSynth, {
          maxPolyphony,
          harmonicity: 2,
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
          modulation: { type: 'square' },
          modulationEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 },
        })

      case 'membrane':
        return new Tone.PolySynth(Tone.Synth, {
          maxPolyphony,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.5, sustain: 0.1, release: 0.4 },
        })

      default:
        return new Tone.PolySynth(Tone.Synth, { maxPolyphony })
    }
  }

  noteOn(note: string, velocity: number = 0.8, time?: number): void {
    this.synth.triggerAttack(note, time ?? Tone.now(), velocity)
  }

  noteOff(note: string, time?: number): void {
    this.synth.triggerRelease(note, time ?? Tone.now())
  }

  releaseAll(): void {
    this.synth.releaseAll()
  }

  triggerAttackRelease(note: string, duration: string = '8n', time?: number, velocity: number = 0.8): void {
    this.synth.triggerAttackRelease(note, duration, time ?? Tone.now(), velocity)
  }

  setVolume(db: number): void {
    this.synth.volume.value = db
  }

  dispose(): void {
    this.synth.dispose()
  }

  changeType(type: InstrumentType): void {
    this.synth.dispose()
    this.type = type
    this.synth = this.createSynth(type)
    this.synth.connect(audioEngine.masterGain)
  }
}
