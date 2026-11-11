// Little synthesized sounds (Web Audio, no files): a chime for each light
// that climbs a pentatonic scale while you keep collecting, a whoosh for a
// ring, a thud for a wall, a fanfare and firework pops at the end.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

// Browsers only allow sound after a tap or a key press – on phones only once
// the finger lifts (touch-down does not count), so this is called on every
// finished tap too. It does nothing once the sound is on.
export function unlockAudio() {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  // "suspended", or Safari's "interrupted" after a call or the share sheet
  if (ctx.state !== "running") {
    void ctx.resume().catch(() => undefined);
    // iPhones wake the sound only when something plays inside the tap
    const blip = ctx.createBufferSource();
    blip.buffer = ctx.createBuffer(1, 1, 22050);
    blip.connect(ctx.destination);
    blip.start(0);
  }
}

function tone(freq: number, start: number, length: number, type: OscillatorType, volume: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

function noise(start: number, length: number, from: number, to: number, volume: number) {
  if (!ctx || !master) return;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, start);
  filter.frequency.exponentialRampToValueAtTime(to, start + length);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + length * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  source.connect(filter).connect(gain).connect(master);
  source.start(start);
}

const PENTATONIC = [0, 2, 4, 7, 9];
export function chime(streak: number) {
  if (!ctx) return;
  const step = Math.min(streak, 14);
  const semis = Math.floor(step / 5) * 12 + PENTATONIC[step % 5];
  const freq = 587 * Math.pow(2, semis / 12);
  const now = ctx.currentTime;
  tone(freq, now, 0.35, "sine", 0.35);
  tone(freq * 2, now, 0.2, "triangle", 0.08);
}

export function whoosh() {
  if (!ctx) return;
  noise(ctx.currentTime, 0.55, 400, 2600, 0.5);
}

export function thud() {
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(95, now, 0.25, "sine", 0.6);
  noise(now, 0.12, 300, 120, 0.25);
}

export function fanfare() {
  if (!ctx) return;
  const now = ctx.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => {
    tone(f, now + i * 0.11, 0.5, "triangle", 0.25);
    tone(f / 2, now + i * 0.11, 0.5, "sine", 0.12);
  });
}

export function pop() {
  if (!ctx) return;
  const now = ctx.currentTime;
  noise(now, 0.35, 1800, 300, 0.35);
}
