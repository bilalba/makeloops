import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LoopLayer } from '@/types'
import { loopRecorder, type RecordingSession } from '@/audio/looper/LoopRecorder'
import { loopPlayer } from '@/audio/looper/LoopPlayer'
import { useInstrumentStore } from './instrumentStore'

let layerIdCounter = 0

function generateLayerId(): string {
  return `layer-${++layerIdCounter}`
}

export const useLooperStore = defineStore('looper', () => {
  const layers = ref<LoopLayer[]>([])
  const isRecording = ref(false)
  const loopDuration = ref(0) // in ticks

  const hasSolo = computed(() => layers.value.some((l) => l.solo))
  const timelineDuration = computed(() => {
    if (layers.value.length === 0) return 0
    return Math.max(
      ...layers.value.map((layer) => getEffectiveDuration(layer))
    )
  })

  const activeLayers = computed(() =>
    layers.value.filter((l) => {
      if (hasSolo.value) {
        return l.solo && !l.muted
      }
      return !l.muted
    })
  )

  function startRecording() {
    const instrumentStore = useInstrumentStore()
    loopRecorder.startRecording(instrumentStore.currentInstrument)
    isRecording.value = true
  }

  function stopRecording(): LoopLayer[] {
    isRecording.value = false
    const sessions = loopRecorder.stopRecording()

    if (sessions.length === 0) {
      return []
    }

    const newLayers: LoopLayer[] = []
    for (const session of sessions) {
      if (session.events.length > 0) {
        const layer = createLayerFromSession(session)
        addLayer(layer)
        newLayers.push(layer)
      }
    }

    return newLayers
  }

  function createLayerFromSession(session: RecordingSession): LoopLayer {
    const instrumentName = session.instrumentType.charAt(0).toUpperCase() +
      session.instrumentType.slice(1)

    return {
      id: generateLayerId(),
      name: `${instrumentName} ${layers.value.length + 1}`,
      events: session.events,
      duration: session.endTicks,
      cropStart: 0,
      cropEnd: session.endTicks,
      startPadding: 0,
      endPadding: 0,
      instrumentId: session.instrumentType,
      volume: 0,
      muted: false,
      solo: false,
    }
  }

  function getEffectiveDuration(layer: LoopLayer): number {
    return layer.cropEnd - layer.cropStart
  }

  function addLayer(layer: LoopLayer) {
    layers.value.push(layer)

    // Update loop duration to longest layer (using effective/cropped duration)
    const effectiveDuration = getEffectiveDuration(layer)
    if (effectiveDuration > loopDuration.value) {
      loopDuration.value = effectiveDuration
      loopPlayer.setLoopDuration(loopDuration.value)
    }

    // Schedule the new layer
    loopPlayer.scheduleLayer(layer)
  }

  function removeLayer(layerId: string) {
    const index = layers.value.findIndex((l) => l.id === layerId)
    if (index === -1) return

    loopPlayer.unscheduleLayer(layerId)
    layers.value.splice(index, 1)

    // Recalculate loop duration using effective durations
    if (layers.value.length > 0) {
      loopDuration.value = Math.max(...layers.value.map((l) => getEffectiveDuration(l)))
      loopPlayer.setLoopDuration(loopDuration.value)
    } else {
      loopDuration.value = 0
    }
  }

  function duplicateLayer(layerId: string): LoopLayer | null {
    const layer = layers.value.find((l) => l.id === layerId)
    if (!layer) return null

    const newLayer: LoopLayer = {
      ...JSON.parse(JSON.stringify(layer)),
      id: generateLayerId(),
      name: `${layer.name} (Copy)`,
    }

    addLayer(newLayer)
    return newLayer
  }

  function shrinkFromStart(layerId: string, ticks: number) {
    const layer = layers.value.find((l) => l.id === layerId)
    if (!layer || ticks <= 0) return

    // Can only shrink if we have padding on this side
    if (layer.startPadding < ticks) return

    layer.cropStart += ticks
    layer.startPadding -= ticks

    // Recalculate loop duration
    loopDuration.value = Math.max(...layers.value.map((l) => getEffectiveDuration(l)))
    loopPlayer.setLoopDuration(loopDuration.value)

    loopPlayer.scheduleLayer(layer)
  }

  function extendFromStart(layerId: string, ticks: number) {
    const layer = layers.value.find((l) => l.id === layerId)
    if (!layer || ticks <= 0) return

    // Add empty space at start - shift all events forward
    layer.events = layer.events.map((event) => ({
      ...event,
      time: event.time + ticks,
    }))
    layer.duration += ticks
    layer.cropEnd += ticks
    layer.startPadding += ticks

    // Recalculate loop duration
    loopDuration.value = Math.max(...layers.value.map((l) => getEffectiveDuration(l)))
    loopPlayer.setLoopDuration(loopDuration.value)

    loopPlayer.scheduleLayer(layer)
  }

  function shrinkFromEnd(layerId: string, ticks: number) {
    const layer = layers.value.find((l) => l.id === layerId)
    if (!layer || ticks <= 0) return

    // Can only shrink if we have padding on this side
    if (layer.endPadding < ticks) return

    layer.cropEnd -= ticks
    layer.endPadding -= ticks

    // Recalculate loop duration
    loopDuration.value = Math.max(...layers.value.map((l) => getEffectiveDuration(l)))
    loopPlayer.setLoopDuration(loopDuration.value)

    loopPlayer.scheduleLayer(layer)
  }

  function extendFromEnd(layerId: string, ticks: number) {
    const layer = layers.value.find((l) => l.id === layerId)
    if (!layer || ticks <= 0) return

    layer.duration += ticks
    layer.cropEnd += ticks
    layer.endPadding += ticks

    loopDuration.value = Math.max(...layers.value.map((l) => getEffectiveDuration(l)))
    loopPlayer.setLoopDuration(loopDuration.value)

    loopPlayer.scheduleLayer(layer)
  }

  function toggleMute(layerId: string) {
    const layer = layers.value.find((l) => l.id === layerId)
    if (!layer) return

    layer.muted = !layer.muted
    loopPlayer.updateLayerMute(layerId, layer.muted)
  }

  function toggleSolo(layerId: string) {
    const layer = layers.value.find((l) => l.id === layerId)
    if (!layer) return

    layer.solo = !layer.solo

    // Update all layers' effective mute state
    layers.value.forEach((l) => {
      const effectivelyMuted = hasSolo.value ? !l.solo || l.muted : l.muted
      loopPlayer.updateLayerMute(l.id, effectivelyMuted)
    })
  }

  function setLayerVolume(layerId: string, volume: number) {
    const layer = layers.value.find((l) => l.id === layerId)
    if (layer) {
      layer.volume = volume
      loopPlayer.updateLayerVolume(layerId, volume)
    }
  }

  function clearAllLayers() {
    loopPlayer.unscheduleAll()
    layers.value = []
    loopDuration.value = 0
    layerIdCounter = 0
  }

  function hydrateFromState(newLayers: LoopLayer[]): { maxGridId: number } {
    // Clear existing layers first
    clearAllLayers()

    // Update layer counter to avoid ID collisions
    // Check both "layer-N" and "grid-N" patterns
    let maxLayerId = 0
    let maxGridId = 0
    for (const layer of newLayers) {
      const layerMatch = layer.id.match(/^layer-(\d+)$/)
      if (layerMatch && layerMatch[1]) {
        maxLayerId = Math.max(maxLayerId, parseInt(layerMatch[1], 10))
      }
      const gridMatch = layer.id.match(/^grid-(\d+)$/)
      if (gridMatch && gridMatch[1]) {
        maxGridId = Math.max(maxGridId, parseInt(gridMatch[1], 10))
      }
    }
    layerIdCounter = maxLayerId

    // Add each layer
    for (const layer of newLayers) {
      addLayer(layer)
    }

    // Return maxGridId so caller can update gridStore's counter
    return { maxGridId }
  }

  function rescheduleAllLayers() {
    layers.value.forEach((layer) => {
      if (!layer.muted && (!hasSolo.value || layer.solo)) {
        loopPlayer.scheduleLayer(layer)
      }
    })
  }

  function recordNoteOn(note: string, velocity: number = 0.8) {
    // Always track held notes (for injection when recording starts)
    loopRecorder.trackNoteOn(note, velocity)
    if (isRecording.value) {
      loopRecorder.recordNoteOn(note, velocity)
    }
  }

  function recordNoteOff(note: string) {
    // Always track held notes
    loopRecorder.trackNoteOff(note)
    if (isRecording.value) {
      loopRecorder.recordNoteOff(note)
    }
  }

  // Temporarily mute all layers (for preview without loops)
  function muteAllLayers() {
    layers.value.forEach((l) => {
      loopPlayer.updateLayerMute(l.id, true)
    })
  }

  // Restore original mute state for all layers
  function restoreLayerMuteStates() {
    layers.value.forEach((l) => {
      const effectivelyMuted = hasSolo.value ? !l.solo || l.muted : l.muted
      loopPlayer.updateLayerMute(l.id, effectivelyMuted)
    })
  }

  return {
    layers,
    isRecording,
    loopDuration,
    hasSolo,
    activeLayers,
    timelineDuration,
    startRecording,
    stopRecording,
    addLayer,
    removeLayer,
    duplicateLayer,
    toggleMute,
    toggleSolo,
    setLayerVolume,
    shrinkFromStart,
    extendFromStart,
    shrinkFromEnd,
    extendFromEnd,
    clearAllLayers,
    rescheduleAllLayers,
    recordNoteOn,
    recordNoteOff,
    muteAllLayers,
    restoreLayerMuteStates,
    hydrateFromState,
  }
})
