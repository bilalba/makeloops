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
import { FolderOpen, Trash2 } from 'lucide-vue-next'
import { useSessionStore, type SavedSession } from '@/stores/sessionStore'
import { useAudioStore } from '@/stores/audioStore'
import { useLooperStore } from '@/stores/looperStore'
import { useGridStore } from '@/stores/gridStore'

const sessionStore = useSessionStore()
const audioStore = useAudioStore()
const looperStore = useLooperStore()
const gridStore = useGridStore()

const dropdownOpen = ref(false)

const hasSessions = computed(() => sessionStore.sessions.length > 0)

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

function handleLoad(session: SavedSession) {
  const loadedSession = sessionStore.loadSession(session.id)
  if (!loadedSession) return

  // Apply BPM
  audioStore.setBpm(loadedSession.bpm)

  // Hydrate grid state if present
  if (loadedSession.grid) {
    gridStore.hydrateFromState(loadedSession.grid)
  }

  // Hydrate layers
  if (loadedSession.layers.length > 0) {
    const { maxGridId } = looperStore.hydrateFromState(loadedSession.layers)
    if (maxGridId > 0) {
      gridStore.setGridLayerCounter(maxGridId)
    }
  } else {
    looperStore.clearAllLayers()
  }

  dropdownOpen.value = false
}

function handleDelete(e: Event, sessionId: string) {
  e.stopPropagation()
  sessionStore.deleteSession(sessionId)
}
</script>

<template>
  <DropdownMenuRoot v-model:open="dropdownOpen">
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm">
        <FolderOpen class="h-4 w-4 mr-2" />
        Load
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent
      class="bg-card border border-border rounded-md shadow-lg py-1 min-w-[200px] max-w-[280px] z-50"
      :side-offset="4"
      align="end"
    >
      <template v-if="hasSessions">
        <div class="px-3 py-2 text-xs text-muted-foreground font-medium">
          Saved Sessions
        </div>
        <DropdownMenuSeparator class="h-px bg-border my-1" />

        <DropdownMenuItem
          v-for="session in sessionStore.sortedSessions"
          :key="session.id"
          class="px-3 py-2 cursor-pointer hover:bg-accent focus:bg-accent outline-none flex items-center justify-between gap-2 group"
          @click="handleLoad(session)"
        >
          <div class="flex-1 min-w-0">
            <div
              class="text-sm truncate"
              :class="{ 'font-medium': session.id === sessionStore.currentSessionId }"
            >
              {{ session.name }}
            </div>
            <div class="text-xs text-muted-foreground">
              {{ formatDate(session.savedAt) }}
            </div>
          </div>
          <button
            class="p-1 rounded hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            @click="(e) => handleDelete(e, session.id)"
            title="Delete session"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </DropdownMenuItem>
      </template>

      <template v-else>
        <div class="px-3 py-4 text-sm text-muted-foreground text-center">
          No saved sessions
        </div>
      </template>
    </DropdownMenuContent>
  </DropdownMenuRoot>
</template>
