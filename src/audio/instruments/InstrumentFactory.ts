import { DrumKit } from './DrumKit'
import { SynthInstrument } from './SynthInstrument'
import type { InstrumentType } from '@/types'

class InstrumentFactory {
  private static instance: InstrumentFactory
  private drumKit: DrumKit | null = null
  private melodicInstruments: Map<InstrumentType, SynthInstrument> = new Map()

  private constructor() {}

  static getInstance(): InstrumentFactory {
    if (!InstrumentFactory.instance) {
      InstrumentFactory.instance = new InstrumentFactory()
    }
    return InstrumentFactory.instance
  }

  getDrumKit(): DrumKit {
    if (!this.drumKit) {
      this.drumKit = new DrumKit()
    }
    return this.drumKit
  }

  getMelodicInstrument(type: InstrumentType): SynthInstrument {
    if (type === 'drums') {
      throw new Error('Use getDrumKit() for drums')
    }

    let instrument = this.melodicInstruments.get(type)
    if (!instrument) {
      instrument = new SynthInstrument(type)
      this.melodicInstruments.set(type, instrument)
    }
    return instrument
  }

  releaseAllNotes(): void {
    this.melodicInstruments.forEach((inst) => inst.releaseAll())
  }

  // More aggressive note silencing that handles queued events
  panicAllNotes(): void {
    // Release immediately
    this.releaseAllNotes()
    // Schedule another release to catch any events that were already queued
    // in Tone.js's scheduler when we called mute/stop
    setTimeout(() => {
      this.releaseAllNotes()
    }, 50)
    setTimeout(() => {
      this.releaseAllNotes()
    }, 100)
  }

  disposeAll(): void {
    this.drumKit?.dispose()
    this.drumKit = null
    this.melodicInstruments.forEach((inst) => inst.dispose())
    this.melodicInstruments.clear()
  }
}

export const instrumentFactory = InstrumentFactory.getInstance()
export default instrumentFactory
