import * as Tone from 'tone'
import type { LoopLayer, DrumSound } from '@/types'
import instrumentFactory from '../instruments/InstrumentFactory'

// Drum sound names for detection
const DRUM_SOUNDS: Set<string> = new Set([
  'kick', 'snare', 'hihat-closed', 'hihat-open',
  'tom-high', 'tom-mid', 'tom-low', 'clap', 'rim', 'crash'
])

function isDrumSound(note: string): boolean {
  return DRUM_SOUNDS.has(note)
}

interface ScheduledLayer {
  layerId: string
  eventIds: number[]
  part: Tone.Part | null
  volume: number // in dB
}

export class LoopPlayer {
  private scheduledLayers: Map<string, ScheduledLayer> = new Map()
  public loopDuration: number = 0 // in ticks

  // Convert dB to linear gain multiplier
  private dbToLinear(db: number): number {
    return Math.pow(10, db / 20)
  }

  setLoopDuration(ticks: number): void {
    this.loopDuration = ticks
    // Keep parts looping independently; do not loop the global transport.
    Tone.getTransport().loop = false
  }

  scheduleLayer(layer: LoopLayer): void {
    // Remove existing scheduled events for this layer
    this.unscheduleLayer(layer.id)

    if (layer.muted) return

    const scheduled: ScheduledLayer = {
      layerId: layer.id,
      eventIds: [],
      part: null,
      volume: layer.volume,
    }

    // Get the appropriate instrument
    const isDrums = layer.instrumentId === 'drums'

    // Calculate effective duration based on crop points
    const effectiveDuration = layer.cropEnd - layer.cropStart

    // Filter events within crop boundaries and adjust their times
    const croppedEvents = this.buildCroppedEvents(layer, effectiveDuration, isDrums)

    // Store reference to this for closure
    const self = this

    // Extract layer properties to avoid closure issues with Vue reactive proxies
    const layerId = layer.id
    const instrumentId = layer.instrumentId

    // Create a Part for synchronized playback
    const part = new Tone.Part((time, event) => {
      const scheduledData = self.scheduledLayers.get(layerId)
      if (!scheduledData) return

      // Apply volume scaling to velocity
      const volumeMultiplier = self.dbToLinear(scheduledData.volume)
      const scaledVelocity = Math.min(1, Math.max(0, event.velocity * volumeMultiplier))

      // Check if this is a drum sound (either by layer type OR by note name as failsafe)
      const isThisDrumSound = isDrums || isDrumSound(event.note)

      if (isThisDrumSound) {
        const drumKit = instrumentFactory.getDrumKit()
        // For drums, the note is actually the drum sound name
        drumKit.trigger(event.note as DrumSound, time, scaledVelocity)
      } else {
        const synth = instrumentFactory.getMelodicInstrument(instrumentId)
        if (event.type === 'noteOn') {
          synth.noteOn(event.note, scaledVelocity, time)
        } else {
          synth.noteOff(event.note, time)
        }
      }
    }, croppedEvents)

    part.loop = true
    part.loopEnd = Tone.Ticks(effectiveDuration).toSeconds()
    part.start(0)

    scheduled.part = part
    this.scheduledLayers.set(layerId, scheduled)
  }

  private buildCroppedEvents(
    layer: LoopLayer,
    effectiveDuration: number,
    isDrums: boolean
  ): Array<{ time: number; note: string; type: 'noteOn' | 'noteOff'; velocity: number }> {
    if (effectiveDuration <= 0) return []

    const cropStart = layer.cropStart
    const cropEnd = layer.cropEnd
    const eventsSorted = [...layer.events].sort((a, b) => a.time - b.time)

    if (isDrums) {
      return eventsSorted
        .filter((event) => event.time >= cropStart && event.time < cropEnd)
        .map((event) => ({
          time: Tone.Ticks(event.time - cropStart).toSeconds(),
          note: event.note,
          type: event.type,
          velocity: event.velocity,
        }))
    }

    const scheduled: Array<{ time: number; note: string; type: 'noteOn' | 'noteOff'; velocity: number }> = []
    const activeNoteCounts: Record<string, number> = {}

    for (const event of eventsSorted) {
      if (event.time < cropStart || event.time >= cropEnd) {
        continue
      }

      const timeInLoop = event.time - cropStart
      scheduled.push({
        time: Tone.Ticks(timeInLoop).toSeconds(),
        note: event.note,
        type: event.type,
        velocity: event.velocity,
      })

      if (event.type === 'noteOn') {
        activeNoteCounts[event.note] = (activeNoteCounts[event.note] ?? 0) + 1
      } else {
        const current = activeNoteCounts[event.note] ?? 0
        if (current > 0) {
          activeNoteCounts[event.note] = current - 1
        }
      }
    }

    // Ensure any notes started within the crop are released by the loop end.
    // Schedule slightly before loopEnd to ensure noteOffs fire before loop restarts.
    const noteOffTime = Tone.Ticks(Math.max(0, effectiveDuration - 1)).toSeconds()
    for (const [note, count] of Object.entries(activeNoteCounts)) {
      if (count <= 0) continue
      for (let i = 0; i < count; i += 1) {
        scheduled.push({
          time: noteOffTime,
          note,
          type: 'noteOff',
          velocity: 0,
        })
      }
    }

    return scheduled.sort((a, b) => a.time - b.time)
  }

  unscheduleLayer(layerId: string): void {
    const scheduled = this.scheduledLayers.get(layerId)
    if (scheduled) {
      scheduled.part?.dispose()
      this.scheduledLayers.delete(layerId)
    }
  }

  unscheduleAll(): void {
    this.scheduledLayers.forEach((scheduled) => {
      scheduled.part?.dispose()
    })
    this.scheduledLayers.clear()
  }

  updateLayerMute(layerId: string, muted: boolean): void {
    const scheduled = this.scheduledLayers.get(layerId)
    if (scheduled?.part) {
      scheduled.part.mute = muted
    }
  }

  updateLayerVolume(layerId: string, volume: number): void {
    const scheduled = this.scheduledLayers.get(layerId)
    if (scheduled) {
      scheduled.volume = volume
    }
  }

  isLayerScheduled(layerId: string): boolean {
    return this.scheduledLayers.has(layerId)
  }

  getScheduledLayerCount(): number {
    return this.scheduledLayers.size
  }
}

export const loopPlayer = new LoopPlayer()
