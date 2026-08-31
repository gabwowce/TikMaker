import React from "react";

export type AudioWaveform = { durationInFrames: number; peaks: number[] };

export function sliceWaveform(peaks: number[], start: number, length: number, total: number): number[] {
  const from = Math.floor(peaks.length * start / Math.max(1, total));
  const to = Math.max(from + 1, Math.ceil(peaks.length * (start + length) / Math.max(1, total)));
  return peaks.slice(from, to);
}

export function fallbackWaveform(seed: string): number[] {
  let value = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) || 1;
  return Array.from({ length: 48 }, () => {
    value = (value * 9301 + 49297) % 233280;
    return 0.18 + value / 291600;
  });
}

const cache = new Map<string, AudioWaveform>();
const pending = new Map<string, Promise<AudioWaveform | null>>();
let sharedAudioContext: AudioContext | null = null;

async function decode(src: string, fps: number): Promise<AudioWaveform | null> {
  const existing = cache.get(src);
  if (existing) return existing;
  const active = pending.get(src);
  if (active) return active;

  const task = (async () => {
    try {
      const response = await fetch(src);
      if (!response.ok) return null;
      const context = sharedAudioContext ?? (sharedAudioContext = new AudioContext());
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      const samples = buffer.getChannelData(0);
      const count = 180;
      const stride = Math.max(1, Math.floor(samples.length / count));
      const peaks = Array.from({ length: count }, (_, index) => {
        const from = index * stride;
        const to = Math.min(samples.length, from + stride);
        let peak = 0;
        for (let at = from; at < to; at += Math.max(1, Math.floor(stride / 80))) peak = Math.max(peak, Math.abs(samples[at] ?? 0));
        return peak;
      });
      const largest = Math.max(0.01, ...peaks);
      const result = { durationInFrames: Math.max(1, Math.round(buffer.duration * fps)), peaks: peaks.map((peak) => peak / largest) };
      cache.set(src, result);
      return result;
    } catch {
      return null;
    } finally {
      pending.delete(src);
    }
  })();
  pending.set(src, task);
  return task;
}

export function useAudioWaveforms(sources: string[], fps: number): Map<string, AudioWaveform> {
  const key = [...new Set(sources.filter(Boolean))].sort().join("\n");
  const [, redraw] = React.useReducer((value) => value + 1, 0);

  React.useEffect(() => {
    let live = true;
    const unique = [...new Set(sources.filter(Boolean))];
    void Promise.all(unique.map((src) => decode(src, fps))).then(() => { if (live) redraw(); });
    return () => { live = false; };
    // `key` deliberately represents the source set without depending on the
    // newly allocated array passed by the timeline on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fps]);

  return new Map([...new Set(sources.filter(Boolean))].flatMap((src) => {
    const value = cache.get(src);
    return value ? [[src, value] as const] : [];
  }));
}
