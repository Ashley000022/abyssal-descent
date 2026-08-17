export type StrumDirection = "down" | "up";

export type ChordName =
  | "C"
  | "D"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "Ab"
  | "A"
  | "Bb"
  | "B"
  | "Db"
  | "Eb"
  | "Am"
  | "Em"
  | "Dm"
  | "Bm"
  | "A7"
  | "B7"
  | "D7"
  | "E7"
  | "Cm"
  | "F#7";

export type ChordShape = readonly (number | null)[];

export const CHORD_SHAPES: Record<ChordName, ChordShape> = {
  C: [null, 3, 2, 0, 1, 0],
  D: [null, null, 0, 2, 3, 2],
  E: [0, 2, 2, 1, 0, 0],
  F: [1, 3, 3, 2, 1, 1],
  "F#": [2, 4, 4, 3, 2, 2],
  G: [3, 2, 0, 0, 0, 3],
  Ab: [4, 6, 6, 5, 4, 4],
  A: [null, 0, 2, 2, 2, 0],
  Bb: [null, 1, 3, 3, 3, 1],
  B: [null, 2, 4, 4, 4, 2],
  Db: [null, 4, 6, 6, 6, 4],
  Eb: [null, 6, 8, 8, 8, 6],
  Am: [null, 0, 2, 2, 1, 0],
  Em: [0, 2, 2, 0, 0, 0],
  Dm: [null, null, 0, 2, 3, 1],
  Bm: [null, 2, 4, 4, 3, 2],
  A7: [null, 0, 2, 0, 2, 0],
  B7: [null, 2, 1, 2, 0, 2],
  D7: [null, null, 0, 2, 1, 2],
  E7: [0, 2, 0, 1, 0, 0],
  Cm: [null, 3, 5, 5, 4, 3],
  "F#7": [2, 4, 2, 3, 2, 2],
};

const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64] as const;
const PITCH_CLASS: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export function transposeChordLabel(chord: ChordName, semitones: number) {
  const match = chord.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match) return chord;
  const [, root, quality] = match;
  const pitch = PITCH_CLASS[root];
  if (pitch === undefined) return chord;
  return `${FLAT_NAMES[(pitch + semitones + 12) % 12]}${quality}`;
}

function midiToFrequency(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function makeRoomImpulse(context: AudioContext) {
  const duration = 0.72;
  const length = Math.floor(context.sampleRate * duration);
  const impulse = context.createBuffer(2, length, context.sampleRate);

  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const envelope = (1 - i / length) ** 2.4;
      data[i] = (Math.random() * 2 - 1) * envelope * 0.42;
    }
  }

  return impulse;
}

function makePluckBuffer(context: AudioContext, frequency: number, brightness: number) {
  const duration = 3.2;
  const sampleRate = context.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = context.createBuffer(1, length, sampleRate);
  const output = buffer.getChannelData(0);
  const delayLength = Math.max(2, Math.round(sampleRate / frequency));
  const delay = new Float32Array(delayLength);
  const pickPosition = 0.28 + brightness * 0.22;

  for (let i = 0; i < delayLength; i += 1) {
    const pickComb = Math.sin(Math.PI * i * pickPosition) * 0.32;
    delay[i] = (Math.random() * 2 - 1) * (0.72 + pickComb);
  }

  let cursor = 0;
  const damping = 0.992 + brightness * 0.006;
  for (let i = 0; i < length; i += 1) {
    const current = delay[cursor];
    const nextIndex = (cursor + 1) % delayLength;
    const averaged = (current + delay[nextIndex]) * 0.5 * damping;
    delay[cursor] = averaged;
    const age = i / length;
    output[i] = current * (1 - age) ** 0.52;
    cursor = nextIndex;
  }

  return buffer;
}

export class GuitarEngine {
  private context: AudioContext | null = null;
  private input: GainNode | null = null;
  private master: GainNode | null = null;
  private volume = 0.72;
  private brightness = 0.58;
  private arpeggioTimer: number | null = null;
  private arpeggioSession = 0;
  private arpeggioNodes = new Set<{ source: AudioBufferSourceNode; gain: GainNode }>();

  private async ensureContext() {
    if (!this.context) {
      const AudioContextCtor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextCtor) {
        throw new Error("Web Audio is not supported in this browser.");
      }

      const context = new AudioContextCtor();
      const input = context.createGain();
      const dry = context.createGain();
      const wet = context.createGain();
      const convolver = context.createConvolver();
      const compressor = context.createDynamicsCompressor();
      const master = context.createGain();

      convolver.buffer = makeRoomImpulse(context);
      dry.gain.value = 0.91;
      wet.gain.value = 0.16;
      compressor.threshold.value = -18;
      compressor.knee.value = 16;
      compressor.ratio.value = 3.2;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.19;
      master.gain.value = this.volume;

      input.connect(dry);
      input.connect(convolver);
      convolver.connect(wet);
      dry.connect(compressor);
      wet.connect(compressor);
      compressor.connect(master);
      master.connect(context.destination);

      this.context = context;
      this.input = input;
      this.master = master;
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    return this.context;
  }

  setVolume(value: number) {
    this.volume = Math.min(1, Math.max(0, value));
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.018);
    }
  }

  setBrightness(value: number) {
    this.brightness = Math.min(1, Math.max(0, value));
  }

  async activate() {
    await this.ensureContext();
  }

  private schedulePluck(
    context: AudioContext,
    midi: number,
    stringIndex: number,
    time: number,
    duration = 3.05,
    gainScale = 1,
    trackForArpeggio = false,
  ) {
    if (!this.input) return;

    const frequency = midiToFrequency(midi);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const body = context.createBiquadFilter();
    const gain = context.createGain();
    const pan = context.createStereoPanner();

    source.buffer = makePluckBuffer(context, frequency, this.brightness);
    filter.type = "lowpass";
    filter.frequency.value = 3100 + this.brightness * 5200;
    filter.Q.value = 0.48;
    body.type = "peaking";
    body.frequency.value = 188 + stringIndex * 34;
    body.Q.value = 1.15;
    body.gain.value = 2.4;
    pan.pan.value = (stringIndex - 2.5) * 0.07;

    const stringGain = (0.19 + stringIndex * 0.012) * gainScale;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(stringGain, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    source.connect(filter);
    filter.connect(body);
    body.connect(gain);
    gain.connect(pan);
    pan.connect(this.input);
    source.start(time);
    source.stop(time + duration + 0.1);

    if (trackForArpeggio) {
      const node = { source, gain };
      this.arpeggioNodes.add(node);
      source.onended = () => this.arpeggioNodes.delete(node);
    }
  }

  async playChord(chord: ChordName, direction: StrumDirection = "down", capo = 0) {
    const context = await this.ensureContext();
    if (!this.input) return;

    const frets = CHORD_SHAPES[chord];
    const notes = frets
      .map((fret, stringIndex) =>
        fret === null
          ? null
          : {
              midi: OPEN_STRING_MIDI[stringIndex] + fret + capo,
              stringIndex,
            },
      )
      .filter((note): note is { midi: number; stringIndex: number } => note !== null);

    const ordered = direction === "down" ? notes : [...notes].reverse();
    const startAt = context.currentTime + 0.012;
    const spacing = direction === "down" ? 0.027 : 0.021;

    ordered.forEach((note, orderIndex) => {
      const time = startAt + orderIndex * spacing;
      this.schedulePluck(context, note.midi, note.stringIndex, time);
    });
  }

  async startArpeggio(chord: ChordName, capo = 0, tempo = 108) {
    this.stopArpeggio();
    const session = this.arpeggioSession;
    const context = await this.ensureContext();
    if (session !== this.arpeggioSession || !this.input) return;

    const notes = CHORD_SHAPES[chord]
      .map((fret, stringIndex) =>
        fret === null
          ? null
          : {
              midi: OPEN_STRING_MIDI[stringIndex] + fret + capo,
              stringIndex,
            },
      )
      .filter((note): note is { midi: number; stringIndex: number } => note !== null);

    const last = notes.length - 1;
    const pattern = [0, Math.min(2, last), Math.min(3, last), 1, Math.max(1, last - 1), 2, last, Math.min(3, last)];
    const interval = 60_000 / tempo / 2;
    let step = 0;

    const pluckNext = () => {
      if (session !== this.arpeggioSession || !notes.length) return;
      const note = notes[pattern[step % pattern.length]];
      this.schedulePluck(context, note.midi, note.stringIndex, context.currentTime + 0.008, 1.34, 0.82, true);
      step += 1;
    };

    pluckNext();
    this.arpeggioTimer = window.setInterval(pluckNext, interval);
  }

  stopArpeggio() {
    this.arpeggioSession += 1;
    if (this.arpeggioTimer !== null) {
      window.clearInterval(this.arpeggioTimer);
      this.arpeggioTimer = null;
    }

    if (!this.context) {
      this.arpeggioNodes.clear();
      return;
    }

    const now = this.context.currentTime;
    this.arpeggioNodes.forEach(({ source, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
        source.stop(now + 0.07);
      } catch {
        // The source may already have naturally ended.
      }
    });
    this.arpeggioNodes.clear();
  }

  async mute() {
    this.stopArpeggio();
    const context = await this.ensureContext();
    if (!this.master) return;
    const now = context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(this.master.gain.value, 0.0001), now);
    this.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.026);
    this.master.gain.setTargetAtTime(this.volume, now + 0.065, 0.024);
  }
}
