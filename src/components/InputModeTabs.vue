<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Keyboard, Grid3X3 } from 'lucide-vue-next'

defineProps<{
  modelValue: 'keyboard' | 'grid'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: 'keyboard' | 'grid']
}>()
</script>

<template>
  <div class="flex gap-1 p-1 bg-secondary/50 rounded-lg w-fit">
    <Button
      :variant="modelValue === 'keyboard' ? 'default' : 'ghost'"
      size="sm"
      :class="
        cn(
          'min-w-[100px]',
          modelValue !== 'keyboard' && 'text-muted-foreground hover:text-foreground'
        )
      "
      @click="emit('update:modelValue', 'keyboard')"
    >
      <Keyboard class="h-4 w-4 mr-2" />
      Keyboard
    </Button>
    <Button
      :variant="modelValue === 'grid' ? 'default' : 'ghost'"
      size="sm"
      :class="
        cn(
          'min-w-[100px]',
          modelValue !== 'grid' && 'text-muted-foreground hover:text-foreground'
        )
      "
      @click="emit('update:modelValue', 'grid')"
    >
      <Grid3X3 class="h-4 w-4 mr-2" />
      Grid
    </Button>
  </div>
</template>
