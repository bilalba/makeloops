import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LoopLayer, GridPattern, GridMode, ScaleName, RootNote, InstrumentType } from '@/types'

export interface GridState {
  mode: GridMode
  pattern: GridPattern
  drumsPattern: GridPattern
  melodicPatterns: Record<ScaleName, GridPattern>
  scaleName: ScaleName
  rootNote: RootNote
  octave: number
  melodicInstrument: Exclude<InstrumentType, 'drums'>
}

export interface SavedSession {
  id: string
  name: string
  savedAt: number
  bpm: number
  layers: LoopLayer[]
  grid: GridState | null
}

const STORAGE_KEY = 'makeloops_sessions'
const CURRENT_SESSION_KEY = 'makeloops_current_session'

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<SavedSession[]>([])
  const currentSessionId = ref<string | null>(null)
  const currentSessionName = ref<string | null>(null)

  // Load sessions from localStorage
  function loadSessions() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        sessions.value = JSON.parse(stored)
      }
      const currentId = localStorage.getItem(CURRENT_SESSION_KEY)
      if (currentId) {
        const session = sessions.value.find(s => s.id === currentId)
        if (session) {
          currentSessionId.value = session.id
          currentSessionName.value = session.name
        }
      }
    } catch (e) {
      console.error('Failed to load sessions:', e)
      sessions.value = []
    }
  }

  // Persist sessions to localStorage
  function persistSessions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.value))
      if (currentSessionId.value) {
        localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId.value)
      } else {
        localStorage.removeItem(CURRENT_SESSION_KEY)
      }
    } catch (e) {
      console.error('Failed to save sessions:', e)
    }
  }

  // Save current state as a new session or overwrite existing
  function saveSession(
    name: string,
    bpm: number,
    layers: LoopLayer[],
    grid: GridState | null,
    saveAsNew: boolean = false
  ): SavedSession {
    const now = Date.now()

    // If we have a current session and not saving as new, update it
    if (currentSessionId.value && !saveAsNew) {
      const existingSession = sessions.value.find(s => s.id === currentSessionId.value)
      if (existingSession) {
        const updatedSession: SavedSession = {
          id: existingSession.id,
          name,
          savedAt: now,
          bpm,
          layers: JSON.parse(JSON.stringify(layers)),
          grid: grid ? JSON.parse(JSON.stringify(grid)) : null,
        }
        const index = sessions.value.indexOf(existingSession)
        sessions.value[index] = updatedSession
        currentSessionName.value = name
        persistSessions()
        return updatedSession
      }
    }

    // Create new session
    const session: SavedSession = {
      id: generateSessionId(),
      name,
      savedAt: now,
      bpm,
      layers: JSON.parse(JSON.stringify(layers)),
      grid: grid ? JSON.parse(JSON.stringify(grid)) : null,
    }

    sessions.value.unshift(session) // Add to beginning (most recent first)
    currentSessionId.value = session.id
    currentSessionName.value = session.name
    persistSessions()
    return session
  }

  // Load a session
  function loadSession(sessionId: string): SavedSession | null {
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      currentSessionId.value = session.id
      currentSessionName.value = session.name
      persistSessions()
      return session
    }
    return null
  }

  // Delete a session
  function deleteSession(sessionId: string) {
    const index = sessions.value.findIndex(s => s.id === sessionId)
    if (index !== -1) {
      sessions.value.splice(index, 1)
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null
        currentSessionName.value = null
      }
      persistSessions()
    }
  }

  // Clear current session (start fresh)
  function clearCurrentSession() {
    currentSessionId.value = null
    currentSessionName.value = null
    localStorage.removeItem(CURRENT_SESSION_KEY)
  }

  // Check if current state differs from saved session
  const hasUnsavedChanges = computed(() => {
    // For simplicity, we'll assume there are always changes
    // A more sophisticated implementation would compare state
    return true
  })

  const sortedSessions = computed(() => {
    return [...sessions.value].sort((a, b) => b.savedAt - a.savedAt)
  })

  // Initialize on store creation
  loadSessions()

  return {
    sessions,
    currentSessionId,
    currentSessionName,
    sortedSessions,
    hasUnsavedChanges,
    saveSession,
    loadSession,
    deleteSession,
    clearCurrentSession,
    loadSessions,
  }
})
