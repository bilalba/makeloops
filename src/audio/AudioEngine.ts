import * as Tone from 'tone'

class AudioEngine {
  private static instance: AudioEngine
  private initialized = false
  public masterGain: Tone.Gain
  public recorder: Tone.Recorder

  private constructor() {
    this.masterGain = new Tone.Gain(0.8).toDestination()
    this.recorder = new Tone.Recorder()
    this.masterGain.connect(this.recorder)
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine()
    }
    return AudioEngine.instance
  }

  async init(): Promise<void> {
    if (this.initialized) {
      // On mobile, context can get suspended even after init
      // Always try to resume on user gesture
      if (Tone.getContext().state === 'suspended') {
        await Tone.getContext().resume()
        console.log('Audio context resumed')
      }
      return
    }
    await Tone.start()
    this.initialized = true
    console.log('Audio engine initialized')
  }

  isInitialized(): boolean {
    return this.initialized
  }

  setBpm(bpm: number): void {
    Tone.getTransport().bpm.value = bpm
  }

  getBpm(): number {
    return Tone.getTransport().bpm.value
  }

  start(): void {
    Tone.getTransport().start()
  }

  // Start with a scheduled delay (for precise recording sync)
  startAt(offset: string = "+0.1"): void {
    Tone.getTransport().start(offset)
  }

  stop(): void {
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
  }

  pause(): void {
    Tone.getTransport().pause()
  }

  getTransport(): typeof Tone.Transport {
    return Tone.getTransport()
  }

  getPosition(): string {
    return Tone.getTransport().position as string
  }

  getPositionTicks(): number {
    return Tone.getTransport().ticks
  }

  setPosition(position: string | number): void {
    Tone.getTransport().position = position
  }

  async startRecording(): Promise<void> {
    // If recorder is in a bad state, recreate it
    if (this.recorder.state !== 'stopped') {
      this.recorder.dispose()
      this.recorder = new Tone.Recorder()
      this.masterGain.connect(this.recorder)
      // Wait for connection to be established
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    await this.recorder.start()
  }

  async stopRecording(): Promise<Blob> {
    if (this.recorder.state === 'started') {
      return await this.recorder.stop()
    }
    return new Blob([], { type: 'audio/wav' })
  }

  scheduleRepeat(
    callback: (time: number) => void,
    interval: string | number,
    startTime?: string | number
  ): number {
    return Tone.getTransport().scheduleRepeat(callback, interval, startTime)
  }

  clear(eventId: number): void {
    Tone.getTransport().clear(eventId)
  }

  getMeasureTicks(): number {
    return Tone.Time('1m').toTicks()
  }

  ticksToSeconds(ticks: number): number {
    return Tone.Ticks(ticks).toSeconds()
  }

  secondsToTicks(seconds: number): number {
    return Tone.Time(seconds).toTicks()
  }
}

export const audioEngine = AudioEngine.getInstance()
export default audioEngine
