# Loop Creator

A web-based music loop creator with drum pads, a melodic keyboard, multiple synth types, manual loop cropping, unlimited layers, and WAV/MP3 export.

## Features

- 10-key drum pad and  keyboard layout
- Multiple synth types (Piano, Synth, Pluck, FM, AM, Membrane)
- Layered loop recording with mute/solo and crop handles
- WAV/MP3 export via Tone.Recorder + lamejs

## Tech Stack

- Vue 3 + TypeScript + Vite
- Tone.js (Web Audio API)
- Pinia
- Tailwind CSS v4

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Keyboard Map

Drums (keys 1-0):
1 Kick, 2 Snare, 3 Closed Hat, 4 Open Hat, 5 Tom High, 6 Tom Mid, 7 Tom Low, 8 Clap, 9 Rim, 0 Crash

Melodic ():
Top row (sharps) W E T Y U O P
Bottom row (natural) A S D F G H J K L ;

Octave: Z down, X up
