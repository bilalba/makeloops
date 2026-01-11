import type { ScaleName, RootNote } from '@/types'

export interface ScaleDefinition {
  name: string
  intervals: number[] // Semitone intervals from root
}

export const SCALE_DEFINITIONS: Record<ScaleName, ScaleDefinition> = {
  major: { name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11, 12] },
  minor: { name: 'Minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  'pentatonic-major': { name: 'Pentatonic Major', intervals: [0, 2, 4, 7, 9] },
  'pentatonic-minor': { name: 'Pentatonic Minor', intervals: [0, 3, 5, 7, 10] },
  blues: { name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
  dorian: { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  mixolydian: { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  chromatic: { name: 'Chromatic', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
}

export const ROOT_NOTES: RootNote[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
]

/**
 * Get scale notes for a given root, scale, and octave
 * Returns array of note names like ['C4', 'D4', 'E4', ...]
 */
export function getScaleNotes(root: RootNote, scale: ScaleName, octave: number): string[] {
  const rootIndex = ROOT_NOTES.indexOf(root)
  const intervals = SCALE_DEFINITIONS[scale].intervals

  return intervals.map((interval) => {
    const noteIndex = (rootIndex + interval) % 12
    const noteOctave = octave + Math.floor((rootIndex + interval) / 12)
    return `${ROOT_NOTES[noteIndex]}${noteOctave}`
  })
}

/**
 * Get scale notes reversed (highest to lowest) for grid display
 * The grid shows highest notes at top
 */
export function getScaleNotesForGrid(root: RootNote, scale: ScaleName, octave: number): string[] {
  return getScaleNotes(root, scale, octave).reverse()
}
