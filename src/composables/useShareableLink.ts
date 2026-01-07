import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { LoopLayer, GridPattern, GridMode, ScaleName, RootNote, InstrumentType } from '@/types'

// Version for future compatibility
const SHARE_VERSION = 1

interface ShareableState {
  v: number
  bpm: number
  layers: LoopLayer[]
  grid?: {
    mode: GridMode
    pattern: GridPattern
    drumsPattern: GridPattern
    melodicPatterns: Record<ScaleName, GridPattern>
    scaleName: ScaleName
    rootNote: RootNote
    octave: number
    melodicInstrument: Exclude<InstrumentType, 'drums'>
  }
}

export function useShareableLink() {
  function generateShareLink(
    bpm: number,
    layers: LoopLayer[],
    gridState?: ShareableState['grid']
  ): string {
    const state: ShareableState = {
      v: SHARE_VERSION,
      bpm,
      layers,
    }

    if (gridState) {
      state.grid = gridState
    }

    const json = JSON.stringify(state)
    const compressed = compressToEncodedURIComponent(json)

    // Get base URL without hash
    const baseUrl = window.location.origin + window.location.pathname
    return `${baseUrl}#s=${compressed}`
  }

  function parseShareLink(): ShareableState | null {
    const hash = window.location.hash
    if (!hash.startsWith('#s=')) {
      return null
    }

    try {
      const compressed = hash.slice(3) // Remove '#s='
      const json = decompressFromEncodedURIComponent(compressed)
      if (!json) {
        console.error('Failed to decompress share link')
        return null
      }

      const state = JSON.parse(json) as ShareableState

      // Version check for future compatibility
      if (state.v !== SHARE_VERSION) {
        console.warn(`Share link version ${state.v} may not be fully compatible with current version ${SHARE_VERSION}`)
      }

      return state
    } catch (error) {
      console.error('Failed to parse share link:', error)
      return null
    }
  }

  function hasShareLink(): boolean {
    return window.location.hash.startsWith('#s=')
  }

  function clearShareLink(): void {
    // Remove the hash without triggering a page reload
    history.replaceState(null, '', window.location.pathname)
  }

  async function copyToClipboard(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url)
      return true
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        return true
      } catch {
        return false
      } finally {
        document.body.removeChild(textArea)
      }
    }
  }

  return {
    generateShareLink,
    parseShareLink,
    hasShareLink,
    clearShareLink,
    copyToClipboard,
  }
}
