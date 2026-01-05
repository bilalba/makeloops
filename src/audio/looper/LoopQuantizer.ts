import * as Tone from 'tone'

export class LoopQuantizer {
  /**
   * Quantize loop boundaries to nearest measure
   */
  static quantizeBoundaries(
    rawStart: number,
    rawEnd: number,
    gridSize: string = '1m'
  ): { start: number; end: number } {
    const gridTicks = Tone.Time(gridSize).toTicks()
    const start = Math.floor(rawStart / gridTicks) * gridTicks
    const end = Math.ceil(rawEnd / gridTicks) * gridTicks

    // Ensure minimum 1 measure duration
    const minDuration = gridTicks
    if (end - start < minDuration) {
      return { start, end: start + minDuration }
    }

    return { start, end }
  }

  /**
   * Quantize a single timestamp to the nearest grid position
   */
  static quantizeTime(time: number, gridSize: string = '16n'): number {
    const gridTicks = Tone.Time(gridSize).toTicks()
    return Math.round(time / gridTicks) * gridTicks
  }

  /**
   * Calculate the number of measures in a loop
   */
  static getMeasureCount(durationTicks: number): number {
    const measureTicks = Tone.Time('1m').toTicks()
    return Math.ceil(durationTicks / measureTicks)
  }

  /**
   * Get the next measure boundary after a given time
   */
  static getNextMeasureBoundary(currentTicks: number): number {
    const measureTicks = Tone.Time('1m').toTicks()
    return Math.ceil((currentTicks + 1) / measureTicks) * measureTicks
  }

  /**
   * Check if a time is on a measure boundary
   */
  static isOnMeasureBoundary(ticks: number): boolean {
    const measureTicks = Tone.Time('1m').toTicks()
    return ticks % measureTicks === 0
  }
}
