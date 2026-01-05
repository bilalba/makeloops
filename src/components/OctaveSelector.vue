<script setup lang="ts">
import { useInstrumentStore } from '@/stores/instrumentStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Minus, Plus } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const instrumentStore = useInstrumentStore()

const octaves = [7, 6, 5, 4, 3, 2, 1]
</script>

<template>
  <div class="flex items-center gap-4 px-4">
    <Button
      variant="secondary"
      size="sm"
      class="h-10 w-10 p-0 flex flex-col items-center justify-center gap-0.5"
      @click="instrumentStore.octaveDown()"
      :disabled="instrumentStore.octave <= 1"
    >
      <span class="text-[9px] text-muted-foreground">Z</span>
      <Minus class="h-4 w-4" />
    </Button>

    <div class="flex flex-col items-center min-w-[4rem]">
      <Label class="text-xs uppercase tracking-wider text-muted-foreground mb-1">Octave</Label>
      <span class="text-2xl font-bold text-primary">{{ instrumentStore.octave }}</span>
    </div>

    <Button
      variant="secondary"
      size="sm"
      class="h-10 w-10 p-0 flex flex-col items-center justify-center gap-0.5"
      @click="instrumentStore.octaveUp()"
      :disabled="instrumentStore.octave >= 7"
    >
      <span class="text-[9px] text-muted-foreground">X</span>
      <Plus class="h-4 w-4" />
    </Button>

    <div class="flex flex-col gap-0.5 ml-2">
      <Button
        v-for="oct in octaves"
        :key="oct"
        :variant="oct === instrumentStore.octave ? 'default' : 'ghost'"
        size="sm"
        :class="cn(
          'h-4 w-6 p-0 text-[10px]',
          oct === instrumentStore.octave && 'ring-1 ring-primary/50'
        )"
        @click="instrumentStore.setOctave(oct)"
      >
        {{ oct }}
      </Button>
    </div>
  </div>
</template>
