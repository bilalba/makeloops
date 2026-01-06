<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGridStore } from '@/stores/gridStore'
import { useLooperStore } from '@/stores/looperStore'
import { useAudioStore } from '@/stores/audioStore'
import { useAudioContext } from '@/composables/useAudioContext'
import GridCell from './GridCell.vue'
import GridControls from './GridControls.vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Play, Square, Trash2, Plus, ChevronDown } from 'lucide-vue-next'

const gridStore = useGridStore()
const looperStore = useLooperStore()
const audioStore = useAudioStore()
const { initAudio } = useAudioContext()

const showPlayDropdown = ref(false)

function handleAddToLooper() {
  const layer = gridStore.createLoopLayer()
  if (layer) {
    looperStore.addLayer(layer)
  }
}

async function handlePreviewOnly() {
  if (gridStore.isPlaying) {
    gridStore.stopPreview()
    audioStore.stop()
  } else {
    await initAudio()
    await audioStore.init()
    gridStore.startPreview(false)
  }
  showPlayDropdown.value = false
}

async function handlePreviewWithLoops() {
  if (gridStore.isPlaying) {
    gridStore.stopPreview()
    audioStore.stop()
  } else {
    await initAudio()
    await audioStore.init()
    gridStore.startPreview(true)
  }
  showPlayDropdown.value = false
}

function togglePlayDropdown(e: MouseEvent) {
  e.stopPropagation()
  showPlayDropdown.value = !showPlayDropdown.value
}

function closePlayDropdown() {
  showPlayDropdown.value = false
}

// Generate step numbers for header
const stepNumbers = computed(() =>
  Array.from({ length: gridStore.stepCount }, (_, i) => i + 1)
)

// Check if pattern has any active cells
const hasActiveCells = computed(() =>
  gridStore.pattern.some((row) => row.some((cell) => cell.active))
)

// Check if there are loops to play with
const hasLoops = computed(() => looperStore.layers.length > 0)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Controls Bar -->
    <GridControls />

    <!-- Grid Container -->
    <div class="overflow-x-auto">
      <div class="min-w-[600px]">
        <!-- Step Numbers Header -->
        <div class="flex">
          <!-- Spacer for row labels -->
          <div class="w-16 flex-shrink-0" />
          <!-- Step numbers -->
          <div
            class="flex-1 grid"
            :style="{ gridTemplateColumns: `repeat(${gridStore.stepCount}, 1fr)` }"
          >
            <div
              v-for="step in stepNumbers"
              :key="step"
              :class="
                cn(
                  'text-center text-[10px] text-muted-foreground py-1',
                  gridStore.currentStep === step - 1 && 'text-primary font-bold'
                )
              "
            >
              {{ step }}
            </div>
          </div>
        </div>

        <!-- Grid Rows -->
        <div class="border border-border rounded-lg overflow-hidden">
          <div
            v-for="(row, rowIndex) in gridStore.pattern"
            :key="rowIndex"
            :class="
              cn(
                'flex',
                rowIndex !== gridStore.pattern.length - 1 && 'border-b border-border/50'
              )
            "
          >
            <!-- Row Label -->
            <div
              class="w-16 flex-shrink-0 px-2 py-1 bg-card/50 border-r border-border/50 flex items-center"
            >
              <span class="text-xs text-muted-foreground truncate">
                {{ gridStore.rowLabels[rowIndex] }}
              </span>
            </div>

            <!-- Grid Cells -->
            <div
              class="flex-1 grid"
              :style="{ gridTemplateColumns: `repeat(${gridStore.stepCount}, 1fr)` }"
            >
              <GridCell
                v-for="(cell, stepIndex) in row"
                :key="stepIndex"
                :active="cell.active"
                :velocity="cell.velocity"
                :is-current-step="gridStore.currentStep === stepIndex"
                :is-beat="stepIndex % 4 === 0"
                @toggle="gridStore.toggleCell(rowIndex, stepIndex)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-2 flex-wrap">
      <!-- Play Button with Dropdown -->
      <div class="relative">
        <div class="flex items-center">
          <Button
            :variant="gridStore.isPlaying ? 'default' : 'secondary'"
            size="sm"
            class="rounded-r-none"
            @click="handlePreviewOnly"
          >
            <Play v-if="!gridStore.isPlaying" class="h-4 w-4 mr-2" />
            <Square v-else class="h-4 w-4 mr-2 fill-current" />
            {{ gridStore.isPlaying ? 'Stop' : 'Preview' }}
          </Button>
          <Button
            :variant="gridStore.isPlaying ? 'default' : 'secondary'"
            size="sm"
            class="rounded-l-none border-l border-border/50 px-2"
            @click="togglePlayDropdown"
            :disabled="gridStore.isPlaying"
          >
            <ChevronDown class="h-3 w-3" />
          </Button>
        </div>

        <!-- Dropdown Menu -->
        <div
          v-if="showPlayDropdown && !gridStore.isPlaying"
          class="absolute top-full left-0 pt-1 z-50"
        >
          <div class="bg-card border border-border rounded-lg shadow-lg min-w-[160px]">
            <button
              class="w-full px-4 py-2 text-left text-sm hover:bg-secondary/50 rounded-t-lg flex items-center gap-2"
              @click="handlePreviewOnly"
            >
              <Play class="h-3 w-3" />
              Preview
            </button>
            <button
              v-if="hasLoops"
              class="w-full px-4 py-2 text-left text-sm hover:bg-secondary/50 rounded-b-lg flex items-center gap-2"
              @click="handlePreviewWithLoops"
            >
              <Play class="h-3 w-3" />
              Preview with Loops
            </button>
          </div>
        </div>

        <!-- Click outside overlay to close -->
        <div
          v-if="showPlayDropdown"
          class="fixed inset-0 z-40"
          @click="closePlayDropdown"
        />
      </div>

      <Button variant="secondary" size="sm" @click="gridStore.clearPattern">
        <Trash2 class="h-4 w-4 mr-2" />
        Clear
      </Button>

      <div class="flex-1" />

      <Button
        variant="default"
        size="sm"
        :disabled="!hasActiveCells"
        @click="handleAddToLooper"
      >
        <Plus class="h-4 w-4 mr-2" />
        Add to Looper
      </Button>
    </div>
  </div>
</template>
