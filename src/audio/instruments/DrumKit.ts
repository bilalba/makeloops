import * as Tone from 'tone'
import audioEngine from '../AudioEngine'
import type { DrumSound } from '@/types'

// Wrapper for hi-hat/cymbal sounds using filtered noise
class FilteredNoiseSynth {
  private noise: Tone.NoiseSynth
  private filter: Tone.Filter

  constructor(options: { filterFreq: number; filterQ: number; decay: number; release: number }) {
    this.filter = new Tone.Filter({
      frequency: options.filterFreq,
      type: 'highpass',
      Q: options.filterQ,
    }).connect(audioEngine.masterGain)

    this.noise = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: options.decay, sustain: 0, release: options.release },
    }).connect(this.filter)
  }

  triggerAttackRelease(time?: number, velocity?: number) {
    // Stop any previous sound to prevent voice stacking
    this.noise.triggerRelease(time)
    this.noise.triggerAttack(time, velocity)
  }

  dispose() {
    this.noise.dispose()
    this.filter.dispose()
  }
}

export class DrumKit {
  private synths: Map<DrumSound, Tone.Synth | Tone.MembraneSynth | Tone.NoiseSynth | FilteredNoiseSynth>

  constructor() {
    this.synths = new Map()
    this.initDrums()
  }

  private initDrums(): void {
    // Kick - low membrane
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 },
    }).connect(audioEngine.masterGain)
    this.synths.set('kick', kick)

    // Snare - noise + membrane
    const snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    }).connect(audioEngine.masterGain)
    this.synths.set('snare', snare)

    // Hi-hat closed - filtered noise for reliable metallic sound
    const hihatClosed = new FilteredNoiseSynth({
      filterFreq: 8000,
      filterQ: 2,
      decay: 0.08,
      release: 0.02,
    })
    this.synths.set('hihat-closed', hihatClosed)

    // Hi-hat open - longer decay
    const hihatOpen = new FilteredNoiseSynth({
      filterFreq: 6000,
      filterQ: 1.5,
      decay: 0.4,
      release: 0.15,
    })
    this.synths.set('hihat-open', hihatOpen)

    // Tom high
    const tomHigh = new Tone.MembraneSynth({
      pitchDecay: 0.03,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0.01, release: 0.2 },
    }).connect(audioEngine.masterGain)
    this.synths.set('tom-high', tomHigh)

    // Tom mid
    const tomMid = new Tone.MembraneSynth({
      pitchDecay: 0.03,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.25, sustain: 0.01, release: 0.25 },
    }).connect(audioEngine.masterGain)
    this.synths.set('tom-mid', tomMid)

    // Tom low
    const tomLow = new Tone.MembraneSynth({
      pitchDecay: 0.03,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.3 },
    }).connect(audioEngine.masterGain)
    this.synths.set('tom-low', tomLow)

    // Clap
    const clap = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.1 },
    }).connect(audioEngine.masterGain)
    this.synths.set('clap', clap)

    // Rim - short high-pitched click
    const rim = new FilteredNoiseSynth({
      filterFreq: 10000,
      filterQ: 4,
      decay: 0.03,
      release: 0.01,
    })
    this.synths.set('rim', rim)

    // Crash - long wash
    const crash = new FilteredNoiseSynth({
      filterFreq: 4000,
      filterQ: 0.5,
      decay: 1.5,
      release: 0.8,
    })
    this.synths.set('crash', crash)
  }

  trigger(sound: DrumSound, time?: number, velocity: number = 0.8): void {
    const synth = this.synths.get(sound)
    if (!synth) return

    const t = time ?? Tone.now()
    const vel = Math.max(0, Math.min(1, velocity))

    if (synth instanceof Tone.MembraneSynth) {
      const pitchMap: Record<string, string> = {
        kick: 'C1',
        'tom-high': 'G3',
        'tom-mid': 'D3',
        'tom-low': 'A2',
      }
      synth.triggerAttackRelease(pitchMap[sound] || 'C2', '8n', t, vel)
    } else if (synth instanceof Tone.NoiseSynth) {
      synth.triggerAttackRelease('8n', t, vel)
    } else if (synth instanceof FilteredNoiseSynth) {
      synth.triggerAttackRelease(t, vel)
    }
  }

  dispose(): void {
    this.synths.forEach((synth) => synth.dispose())
    this.synths.clear()
  }
}
