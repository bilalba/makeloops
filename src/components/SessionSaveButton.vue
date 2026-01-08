<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from 'radix-vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, ChevronDown, Check } from 'lucide-vue-next'
import { useSessionStore } from '@/stores/sessionStore'
import { useAudioStore } from '@/stores/audioStore'
import { useLooperStore } from '@/stores/looperStore'
import { useGridStore } from '@/stores/gridStore'
import { cn } from '@/lib/utils'

const sessionStore = useSessionStore()
const audioStore = useAudioStore()
const looperStore = useLooperStore()
const gridStore = useGridStore()

const showNameInput = ref(false)
const sessionName = ref('')
const saveStatus = ref<'idle' | 'success'>('idle')
const saveStatusTimeout = ref<number | null>(null)
const dropdownOpen = ref(false)

const hasExistingSession = computed(() => !!sessionStore.currentSessionId)

function showSaveStatus() {
  saveStatus.value = 'success'
  if (saveStatusTimeout.value) {
    clearTimeout(saveStatusTimeout.value)
  }
  saveStatusTimeout.value = window.setTimeout(() => {
    saveStatus.value = 'idle'
  }, 2000)
}

function handleSave() {
  if (!hasExistingSession.value) {
    // No existing session, show name input
    showNameInput.value = true
    sessionName.value = ''
  } else {
    // Overwrite existing session
    sessionStore.saveSession(
      sessionStore.currentSessionName || 'Untitled',
      audioStore.bpm,
      looperStore.layers,
      gridStore.getStateForSharing()
    )
    showSaveStatus()
  }
  dropdownOpen.value = false
}

function handleSaveAs() {
  showNameInput.value = true
  sessionName.value = sessionStore.currentSessionName || ''
  dropdownOpen.value = false
}

function confirmSave() {
  const name = sessionName.value.trim() || 'Untitled'
  const saveAsNew = showNameInput.value && hasExistingSession.value && name !== sessionStore.currentSessionName

  sessionStore.saveSession(
    name,
    audioStore.bpm,
    looperStore.layers,
    gridStore.getStateForSharing(),
    saveAsNew
  )

  showNameInput.value = false
  sessionName.value = ''
  showSaveStatus()
}

function cancelSave() {
  showNameInput.value = false
  sessionName.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    confirmSave()
  } else if (e.key === 'Escape') {
    cancelSave()
  }
}
</script>

<template>
  <!-- Name Input Modal Overlay -->
  <div
    v-if="showNameInput"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    @click.self="cancelSave"
  >
    <div class="bg-card border border-border rounded-lg p-4 shadow-lg w-80">
      <h3 class="text-sm font-medium mb-3">Save Session</h3>
      <Input
        v-model="sessionName"
        placeholder="Enter session name..."
        class="mb-3"
        autofocus
        @keydown="handleKeydown"
      />
      <p class="text-xs text-muted-foreground mb-3">Saved in your browser</p>
      <div class="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" @click="cancelSave">Cancel</Button>
        <Button size="sm" @click="confirmSave">Save</Button>
      </div>
    </div>
  </div>

  <!-- Save Button with Dropdown -->
  <DropdownMenuRoot v-model:open="dropdownOpen">
    <div class="flex">
      <!-- Main Save Button -->
      <Button
        variant="outline"
        size="sm"
        :class="cn(
          'rounded-r-none border-r-0 transition-all',
          saveStatus === 'success' && 'text-green-500 border-green-500/50'
        )"
        @click="handleSave"
      >
        <Check v-if="saveStatus === 'success'" class="h-4 w-4 mr-2" />
        <Save v-else class="h-4 w-4 mr-2" />
        {{ saveStatus === 'success' ? 'Saved!' : 'Save' }}
      </Button>

      <!-- Dropdown Trigger -->
      <DropdownMenuTrigger as-child>
        <Button
          variant="outline"
          size="sm"
          class="rounded-l-none px-2"
        >
          <ChevronDown class="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
    </div>

    <DropdownMenuContent
      class="bg-card border border-border rounded-md shadow-lg py-1 min-w-[120px] z-50"
      :side-offset="4"
      align="end"
    >
      <DropdownMenuItem
        class="px-3 py-2 text-sm cursor-pointer hover:bg-accent focus:bg-accent outline-none"
        @click="handleSave"
      >
        Save
      </DropdownMenuItem>
      <DropdownMenuSeparator class="h-px bg-border my-1" />
      <DropdownMenuItem
        class="px-3 py-2 text-sm cursor-pointer hover:bg-accent focus:bg-accent outline-none"
        @click="handleSaveAs"
      >
        Save As...
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenuRoot>
</template>
