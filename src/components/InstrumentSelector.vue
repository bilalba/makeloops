<script setup lang="ts">
import { useInstrumentStore } from '@/stores/instrumentStore'
import type { InstrumentType } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Piano, Radio, Guitar, Disc, Volume2, Waves } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  showLabel?: boolean
  compact?: boolean
}>(), {
  showLabel: true,
  compact: false,
})

const instrumentStore = useInstrumentStore()

const instruments: { type: InstrumentType; label: string; icon: typeof Piano }[] = [
  { type: 'piano', label: 'Piano', icon: Piano },
  { type: 'synth', label: 'Synth', icon: Waves },
  { type: 'pluck', label: 'Pluck', icon: Guitar },
  { type: 'fm', label: 'FM', icon: Radio },
  { type: 'am', label: 'AM', icon: Disc },
  { type: 'membrane', label: 'Membrane', icon: Volume2 },
]

function selectInstrument(type: InstrumentType) {
  instrumentStore.setInstrument(type)
}
</script>

<template>
  <div :class="cn('flex items-center gap-3', props.compact && 'gap-2')">
    <Label
      v-if="props.showLabel"
      class="text-xs uppercase tracking-wider text-muted-foreground"
    >
      Instrument
    </Label>
    <div :class="cn('flex gap-1', props.compact && 'flex-1 overflow-x-auto')">
      <Button
        v-for="inst in instruments"
        :key="inst.type"
        :variant="instrumentStore.currentInstrument === inst.type ? 'default' : 'secondary'"
        size="sm"
        :class="cn(
          'flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 min-w-[3.5rem]',
          props.compact && 'min-w-[2.75rem] px-2 py-1',
          instrumentStore.currentInstrument === inst.type && 'ring-1 ring-primary/50'
        )"
        @click="selectInstrument(inst.type)"
        :title="inst.label"
      >
        <component :is="inst.icon" class="h-4 w-4" />
        <span :class="cn('text-[10px] leading-none', props.compact && 'text-[9px]')">
          {{ inst.label }}
        </span>
      </Button>
    </div>
  </div>
</template>
