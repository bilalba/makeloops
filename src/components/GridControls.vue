<script setup lang="ts">
import { computed } from 'vue'
import { useGridStore } from '@/stores/gridStore'
import { SCALE_DEFINITIONS, ROOT_NOTES } from '@/utils/scales'
import type { ScaleName, RootNote, InstrumentType } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Drum, Music, Shuffle } from 'lucide-vue-next'

const gridStore = useGridStore()

const scaleOptions = computed(() =>
  Object.entries(SCALE_DEFINITIONS).map(([key, def]) => ({
    value: key as ScaleName,
    label: def.name,
  }))
)

const melodicInstruments: { type: Exclude<InstrumentType, 'drums'>; label: string }[] = [
  { type: 'piano', label: 'Piano' },
  { type: 'synth', label: 'Synth' },
  { type: 'pluck', label: 'Pluck' },
  { type: 'fm', label: 'FM' },
  { type: 'am', label: 'AM' },
  { type: 'membrane', label: 'Membrane' },
]

function handleDensityChange(value: number[] | undefined) {
  if (value && value[0] !== undefined) {
    gridStore.setNoteDensity(value[0])
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-4">
    <!-- Mode Toggle -->
    <div class="flex items-center gap-2">
      <Label class="text-xs uppercase tracking-wider text-muted-foreground">Mode</Label>
      <div class="flex gap-1">
        <Button
          :variant="gridStore.mode === 'drums' ? 'default' : 'secondary'"
          size="sm"
          @click="gridStore.setMode('drums')"
        >
          <Drum class="h-4 w-4 mr-1" />
          Drums
        </Button>
        <Button
          :variant="gridStore.mode === 'melodic' ? 'default' : 'secondary'"
          size="sm"
          @click="gridStore.setMode('melodic')"
        >
          <Music class="h-4 w-4 mr-1" />
          Melodic
        </Button>
      </div>
    </div>

    <!-- Melodic-only controls -->
    <template v-if="gridStore.mode === 'melodic'">
      <!-- Root Note -->
      <div class="flex items-center gap-2">
        <Label class="text-xs uppercase tracking-wider text-muted-foreground">Root</Label>
        <select
          :value="gridStore.rootNote"
          class="h-8 px-2 rounded-md border border-border bg-secondary/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          @change="gridStore.setRootNote(($event.target as HTMLSelectElement).value as RootNote)"
        >
          <option v-for="note in ROOT_NOTES" :key="note" :value="note">{{ note }}</option>
        </select>
      </div>

      <!-- Scale -->
      <div class="flex items-center gap-2">
        <Label class="text-xs uppercase tracking-wider text-muted-foreground">Scale</Label>
        <select
          :value="gridStore.scaleName"
          class="h-8 px-2 rounded-md border border-border bg-secondary/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          @change="gridStore.setScale(($event.target as HTMLSelectElement).value as ScaleName)"
        >
          <option v-for="scale in scaleOptions" :key="scale.value" :value="scale.value">
            {{ scale.label }}
          </option>
        </select>
      </div>

      <!-- Octave -->
      <div class="flex items-center gap-2">
        <Label class="text-xs uppercase tracking-wider text-muted-foreground">Octave</Label>
        <select
          :value="gridStore.octave"
          class="h-8 px-2 rounded-md border border-border bg-secondary/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          @change="gridStore.setOctave(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="oct in [2, 3, 4, 5, 6]" :key="oct" :value="oct">{{ oct }}</option>
        </select>
      </div>

      <!-- Instrument -->
      <div class="flex items-center gap-2">
        <Label class="text-xs uppercase tracking-wider text-muted-foreground">Synth</Label>
        <select
          :value="gridStore.melodicInstrument"
          class="h-8 px-2 rounded-md border border-border bg-secondary/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          @change="
            gridStore.setMelodicInstrument(
              ($event.target as HTMLSelectElement).value as Exclude<InstrumentType, 'drums'>
            )
          "
        >
          <option v-for="inst in melodicInstruments" :key="inst.type" :value="inst.type">
            {{ inst.label }}
          </option>
        </select>
      </div>
    </template>

    <!-- Randomization: Density Slider + Randomize Button -->
    <div class="flex items-center gap-2">
      <Label class="text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        Randomization
      </Label>
      <Slider
        :model-value="[gridStore.noteDensity]"
        :min="0.1"
        :max="0.8"
        :step="0.05"
        class="w-20"
        @update:model-value="handleDensityChange"
      />
      <span class="text-xs text-muted-foreground w-8">
        {{ Math.round(gridStore.noteDensity * 100) }}%
      </span>
      <Button variant="secondary" size="sm" @click="gridStore.randomizePattern">
        <Shuffle class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
