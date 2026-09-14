import { getSfx } from "../../registries/sfxRegistry";
import {
  fallbackWaveform,
  sliceWaveform,
  type AudioWaveform,
} from "./useAudioWaveforms";
export function audioCueShape(
  audioWaveforms: Map<string, AudioWaveform>,
  id: string,
  sourceStart: number,
  requestedDuration: number | undefined,
  seed: string,
) {
  const src = getSfx(id)?.src;
  const info = src ? audioWaveforms.get(src) : undefined;
  const available = Math.max(
    1,
    (info?.durationInFrames ?? sourceStart + (requestedDuration ?? 30)) -
      sourceStart,
  );
  const length = Math.min(requestedDuration ?? available, available);
  return {
    length,
    available,
    waveform: info
      ? sliceWaveform(info.peaks, sourceStart, length, info.durationInFrames)
      : fallbackWaveform(seed),
  };
}
