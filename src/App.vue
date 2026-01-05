<script setup lang="ts">
import { ref } from 'vue'
import { useAudioContext } from '@/composables/useAudioContext'
import { useKeyboard, DRUM_MAP, MELODIC_TOP_ROW, MELODIC_BOTTOM_ROW, OCTAVE_UP_KEYS } from '@/composables/useKeyboard'
import { useAudioStore } from '@/stores/audioStore'
import { useInstrumentStore } from '@/stores/instrumentStore'
import { useLooperStore } from '@/stores/looperStore'
import type { DrumSound } from '@/types'

import Drumpad from '@/components/Drumpad.vue'
import MelodicPad from '@/components/MelodicPad.vue'
import OctaveSelector from '@/components/OctaveSelector.vue'
import InstrumentSelector from '@/components/InstrumentSelector.vue'
import TransportControls from '@/components/TransportControls.vue'
import LooperPanel from '@/components/LooperPanel.vue'
import { Card } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'

const { initialized, initAudio } = useAudioContext()
const audioStore = useAudioStore()
const instrumentStore = useInstrumentStore()
const looperStore = useLooperStore()

const drumpadRef = ref<InstanceType<typeof Drumpad> | null>(null)
const melodicPadRef = ref<InstanceType<typeof MelodicPad> | null>(null)

// Initialize audio on first user interaction
async function handleFirstInteraction() {
  if (!initialized.value) {
    await initAudio()
    await audioStore.init()
  }
}

// Keyboard handling
useKeyboard({
  onDrumTrigger: async (sound: DrumSound) => {
    await handleFirstInteraction()
    const drumKit = instrumentStore.getDrumKit()
    drumKit.trigger(sound)
    drumpadRef.value?.handleKeyTrigger(DRUM_MAP[sound] ? Object.keys(DRUM_MAP).find(k => DRUM_MAP[k] === sound) || '' : '')

    // Record drum hit
    if (looperStore.isRecording) {
      looperStore.recordNoteOn(sound)
    }
  },
  onNoteOn: async (note: string, octaveOffset: number) => {
    await handleFirstInteraction()
    const fullNote = instrumentStore.getNoteWithOctave(note, octaveOffset)
    const synth = instrumentStore.getMelodicInstrument()
    synth.noteOn(fullNote)

    // Find the key to highlight
    const keyLower = Object.entries({ ...MELODIC_TOP_ROW, ...MELODIC_BOTTOM_ROW })
      .find(([k, v]) => v === note && (OCTAVE_UP_KEYS.includes(k) === (octaveOffset === 1)))?.[0]
    if (keyLower) {
      melodicPadRef.value?.handleKeyPress(keyLower, true)
    }

    // Record note
    if (looperStore.isRecording) {
      looperStore.recordNoteOn(fullNote)
    }
  },
  onNoteOff: (note: string, octaveOffset: number) => {
    const fullNote = instrumentStore.getNoteWithOctave(note, octaveOffset)
    const synth = instrumentStore.getMelodicInstrument()
    synth.noteOff(fullNote)

    const keyLower = Object.entries({ ...MELODIC_TOP_ROW, ...MELODIC_BOTTOM_ROW })
      .find(([k, v]) => v === note && (OCTAVE_UP_KEYS.includes(k) === (octaveOffset === 1)))?.[0]
    if (keyLower) {
      melodicPadRef.value?.handleKeyPress(keyLower, false)
    }

    // Record note off
    if (looperStore.isRecording) {
      looperStore.recordNoteOff(fullNote)
    }
  },
  onOctaveUp: () => instrumentStore.octaveUp(),
  onOctaveDown: () => instrumentStore.octaveDown(),
})

// Handle mouse-based note events from MelodicPad
async function handleMelodicNoteOn(note: string) {
  await handleFirstInteraction()
  const synth = instrumentStore.getMelodicInstrument()
  synth.noteOn(note)

  if (looperStore.isRecording) {
    looperStore.recordNoteOn(note)
  }
}

function handleMelodicNoteOff(note: string) {
  const synth = instrumentStore.getMelodicInstrument()
  synth.noteOff(note)

  if (looperStore.isRecording) {
    looperStore.recordNoteOff(note)
  }
}

// Handle drum triggers from Drumpad
async function handleDrumTrigger(sound: DrumSound) {
  await handleFirstInteraction()
  const drumKit = instrumentStore.getDrumKit()
  drumKit.trigger(sound)

  if (looperStore.isRecording) {
    looperStore.recordNoteOn(sound)
  }
}
</script>

<template>
  <TooltipProvider>
    <div class="min-h-screen flex flex-col bg-background" @click="handleFirstInteraction">
      <!-- Header -->
      <header class="flex items-center justify-between px-6 py-4 border-b border-border bg-card/30">
        <h1 class="text-2xl font-bold">
          makeloops.online
        </h1>
        <InstrumentSelector />
      </header>

      <!-- Main Content -->
      <main class="flex-1 p-6 flex flex-col gap-6 max-w-[1200px] mx-auto w-full">
        <!-- Pads Section -->
        <section class="grid grid-cols-[auto_1fr] gap-6">
          <Card class="bg-card/50 border-border">
            <Drumpad ref="drumpadRef" @trigger="handleDrumTrigger" />
          </Card>
          <Card class="bg-card/50 border-border flex flex-col gap-4 pb-4">
            <MelodicPad
              ref="melodicPadRef"
              @noteOn="handleMelodicNoteOn"
              @noteOff="handleMelodicNoteOff"
            />
            <OctaveSelector />
          </Card>
        </section>

        <!-- Transport -->
        <Card class="flex items-center px-6 py-4 bg-card/50 border-border">
          <TransportControls />
        </Card>

        <!-- Looper Section -->
        <section class="flex-1">
          <LooperPanel />
        </section>
      </main>

    </div>
  </TooltipProvider>
</template>
