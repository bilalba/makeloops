<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '@/stores/sessionStore'

const sessionStore = useSessionStore()

const displayName = computed(() => {
  return sessionStore.currentSessionName || 'Unsaved'
})

const isUnsaved = computed(() => !sessionStore.currentSessionId)
</script>

<template>
  <span
    class="text-xs px-2 py-1 rounded"
    :class="isUnsaved ? 'text-muted-foreground' : 'text-foreground/70 bg-accent/50'"
  >
    {{ displayName }}
  </span>
</template>
