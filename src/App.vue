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
import RecordControls from '@/components/RecordControls.vue'
import LooperPanel from '@/components/LooperPanel.vue'
import InputModeTabs from '@/components/InputModeTabs.vue'
import GridSequencer from '@/components/GridSequencer.vue'
import { Card } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'

const { initialized, initAudio } = useAudioContext()
const audioStore = useAudioStore()
const instrumentStore = useInstrumentStore()
const looperStore = useLooperStore()

const drumpadRef = ref<InstanceType<typeof Drumpad> | null>(null)
const melodicPadRef = ref<InstanceType<typeof MelodicPad> | null>(null)
const inputMode = ref<'keyboard' | 'grid'>('grid')

// Initialize audio on first user interaction
async function handleFirstInteraction() {
  if (!initialized.value) {
    await initAudio()
    await audioStore.init()
  }
}

// Handle touch events for mobile audio unlock
function handleTouch() {
  handleFirstInteraction()
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
    <div class="min-h-screen flex flex-col bg-background" @click="handleFirstInteraction" @touchstart="handleTouch">
      <!-- Header -->
      <header class="flex items-center justify-between px-6 py-4 border-b border-border bg-card/30">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <span>makeloops.online</span>
          <a
            class="text-muted-foreground hover:text-foreground transition-colors"
            href="https://github.com/bilalba/makeloops"
            target="_blank"
            rel="noreferrer"
            aria-label="Makeloops GitHub repository"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M12 .5C5.65.5.5 5.64.5 12c0 5.1 3.29 9.42 7.86 10.95.58.1.8-.25.8-.56 0-.28-.02-1.22-.02-2.22-2.9.53-3.65-.71-3.88-1.36-.13-.33-.7-1.36-1.2-1.63-.41-.22-1-.76-.02-.77.92-.02 1.58.85 1.8 1.2 1.05 1.77 2.73 1.27 3.4.97.1-.76.41-1.27.75-1.56-2.56-.29-5.24-1.28-5.24-5.68 0-1.25.44-2.27 1.17-3.07-.12-.29-.51-1.47.12-3.06 0 0 .96-.31 3.15 1.17a10.7 10.7 0 0 1 5.74 0c2.19-1.48 3.15-1.17 3.15-1.17.63 1.59.24 2.77.12 3.06.73.8 1.17 1.82 1.17 3.07 0 4.41-2.69 5.39-5.26 5.67.42.36.8 1.08.8 2.18 0 1.57-.02 2.84-.02 3.23 0 .31.22.67.8.56A11.52 11.52 0 0 0 23.5 12C23.5 5.64 18.36.5 12 .5Z"
              />
            </svg>
          </a>
        </h1>
        <InstrumentSelector />
      </header>

      <!-- Main Content -->
      <main class="flex-1 p-6 flex flex-col gap-6 max-w-[1200px] mx-auto w-full">
        <!-- Input Mode Tabs -->
        <InputModeTabs v-model="inputMode" />

        <!-- Pads Section - Keyboard Mode -->
        <section v-if="inputMode === 'keyboard'" class="grid grid-cols-[auto_1fr] gap-6">
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

        <!-- Grid Sequencer Mode -->
        <section v-else>
          <Card class="bg-card/50 border-border p-4">
            <GridSequencer />
          </Card>
        </section>

        <!-- Transport -->
        <Card class="flex items-center gap-6 px-6 py-4 bg-card/50 border-border">
          <RecordControls v-if="inputMode === 'keyboard'" />
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
