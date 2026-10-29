# B9. Foninė muzika – planas

Tikslas: vienas foninis takelis visam video. Jis **pritaikomas prie ilgio** (kartojamas
ir užgęsta pabaigoje) ir **patylinamas, kai kalba įgarsinimas**. Muziką pasirenki iš
bibliotekos arba įkeli pati.

## Sprendimai (kodėl taip)

- **Muzika yra projekto laukas `project.music`, o ne dar vienas `audioClips[]` įrašas.**
  Klipas turi pradžią ir ilgį, kuriuos tempi laiko juostoje. Muzika visada trunka visą
  video, todėl jos ilgio niekas neturi nustatinėti ranka. Kai video pailgėja ar
  sutrumpėja, muzika prisitaiko pati.
- **Muzikos failai yra garsai su grupe `music`.** Įkėlimas, `custom-sfx.json`,
  `sfxRegistry` ir `assetUrl` jau veikia. Pridedama tik viena grupė, todėl nereikia
  antro įkėlimo kelio ar antro manifesto.
- **Patylinimas skaičiuojamas iš to paties šaltinio kaip subtitrai.** Kalbos laikai
  imami iš `audioClips[].words`. Žodžio laikas paverčiamas kadru ta pačia formule kaip
  `captionTimeline` (`src/utils/captions.ts:52`). Jei klipas neturi `words`, imamas
  visas klipo langas.
- **Matematika – React neturinčiame modulyje** (`src/utils/music.ts`), kaip
  `voiceClips.ts`: ją lengva testuoti, o komponentas lieka trumpas.
- Garsumo kreivės yra tiesinės. `easing.ts` skirtas judesiui, garsui jo nereikia.

## Failai

| # | Failas | Kas |
|---|---|---|
| 1 | `src/schema/project.ts` | laukas `music` |
| 2 | `src/registries/sfxRegistry.ts` | grupė `"music"` |
| 3 | `src/utils/music.ts` (naujas) | kalbos intervalai + garsumas kadre |
| 4 | `src/utils/__tests__/music.test.ts` (naujas) | testai |
| 5 | `src/video/BackgroundMusic.tsx` (naujas) | `<Audio loop volume={…}>` |
| 6 | `src/video/TikTokVideo.tsx` | įdėti `<BackgroundMusic>` |
| 7 | `projectStoreTypes.ts`, `projectStore.ts` | `updateProjectMusic` |
| 8 | `src/editor/library/SoundLibrary.tsx` | sekcija „Background music“ + grupė įkėlimo formoje |
| 9 | `CLAUDE.md`, `docs/darbu-eile.md` | aprašymas, `[x] B9` |

---

## 1. Schema – `src/schema/project.ts`

Įdėk po `captions` lauko:

```ts
  // One background track for the whole video (B9). Fitted to the video's
  // length — looped, faded in and out — and ducked while the voiceover speaks.
  // sfxId points at a sound in the "music" group.
  music: z
    .object({
      sfxId: z.string(),
      volume: z.number().min(0).max(1).optional(),
      duckVolume: z.number().min(0).max(1).optional(),
      startFrom: z.number().min(0).optional(),
      fadeInFrames: z.number().int().min(0).optional(),
      fadeOutFrames: z.number().int().min(0).optional(),
    })
    .optional(),
```

Kai lauko nėra, video lieka be muzikos, todėl seni projektai nepasikeičia.

## 2. Grupė – `src/registries/sfxRegistry.ts`

```ts
export type SfxGroup =
  | "ui"
  | "impact"
  | "text"
  | "transition"
  | "reveal"
  | "success"
  | "voice"
  | "music"
  | "misc";
```

`server/trpc/sfx.ts` grupę tik perduoda (`as SfxGroup`), todėl ten keisti nieko nereikia.
Failo dydžio riba serveryje yra 500 MB (`server/app.ts:8`), dainai jos užtenka.

## 3. Logika – `src/utils/music.ts` (naujas)

```ts
import type { VideoProject } from "../schema/project";
import { isVoiceClip, resolveAudioClips, type AudioClip } from "./voiceClips";

export type ProjectMusic = NonNullable<VideoProject["music"]>;
export type FrameRange = { start: number; end: number };

export const MUSIC_DEFAULTS = {
  volume: 0.25,
  duckVolume: 0.08,
  fadeInFrames: 15,
  fadeOutFrames: 45,
};
// How long the music takes to dip under the voice and come back up.
export const DUCK_RAMP_FRAMES = 8;
// Pauses shorter than this stay ducked — the music pumping up between two
// sentences reads as a mistake, not as a breath.
export const DUCK_MERGE_GAP_FRAMES = 15;

// When the voiceover is actually speaking, in video frames. A clip with
// `words` is trimmed to its first and last word (generated audio has silence
// at both ends); one without falls back to its whole window.
export function voiceRanges(
  clips: AudioClip[],
  totalDuration: number,
  fps: number,
  isVoice: (clip: AudioClip) => boolean = isVoiceClip,
): FrameRange[] {
  const ranges = resolveAudioClips(clips, totalDuration)
    .filter(({ clip }) => isVoice(clip))
    .map(({ clip, from, durationInFrames }) => {
      const end = from + durationInFrames;
      const words = clip.words;
      if (!words?.length) return { start: from, end };
      const startFrom = clip.startFrom ?? 0;
      const rate = clip.playbackRate ?? 1;
      // Same conversion as captionTimeline, so ducking and captions agree.
      const toFrame = (seconds: number) => from + (seconds * fps - startFrom) / rate;
      return {
        start: Math.max(from, toFrame(words[0].start)),
        end: Math.min(end, toFrame(words[words.length - 1].end)),
      };
    })
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start);

  const merged: FrameRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start - last.end <= DUCK_MERGE_GAP_FRAMES) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

// 0 = full music, 1 = fully ducked. Ramps over DUCK_RAMP_FRAMES on both sides
// of each speech range, so the dip starts just before the first word.
function duckAmount(frame: number, speech: FrameRange[]): number {
  let amount = 0;
  for (const range of speech) {
    const distance =
      frame < range.start ? range.start - frame : frame > range.end ? frame - range.end : 0;
    amount = Math.max(amount, 1 - distance / DUCK_RAMP_FRAMES);
  }
  return Math.min(1, Math.max(0, amount));
}

export function musicVolumeAt(
  frame: number,
  totalDuration: number,
  speech: FrameRange[],
  music: ProjectMusic,
): number {
  const volume = music.volume ?? MUSIC_DEFAULTS.volume;
  // Ducking never makes the music LOUDER than its own level.
  const ducked = Math.min(volume, music.duckVolume ?? MUSIC_DEFAULTS.duckVolume);
  const level = volume + (ducked - volume) * duckAmount(frame, speech);

  const fadeIn = music.fadeInFrames ?? MUSIC_DEFAULTS.fadeInFrames;
  const fadeOut = music.fadeOutFrames ?? MUSIC_DEFAULTS.fadeOutFrames;
  const inGain = fadeIn > 0 ? Math.min(1, frame / fadeIn) : 1;
  const outGain = fadeOut > 0 ? Math.min(1, (totalDuration - frame) / fadeOut) : 1;
  return Math.max(0, level * Math.min(inGain, outGain));
}
```

## 4. Testai – `src/utils/__tests__/music.test.ts` (naujas)

```ts
import { describe, expect, it } from "vitest";
import { MUSIC_DEFAULTS, musicVolumeAt, voiceRanges } from "../music";
import type { AudioClip } from "../voiceClips";

const isVoice = (clip: AudioClip) => clip.sfxId.startsWith("vo-");
const music = { sfxId: "song", volume: 0.3, duckVolume: 0.1, fadeInFrames: 0, fadeOutFrames: 0 };

describe("voiceRanges", () => {
  it("trims a clip with words to when it actually speaks", () => {
    const clips: AudioClip[] = [
      {
        id: "a",
        sfxId: "vo-a",
        from: 30,
        durationInFrames: 120,
        words: [
          { text: "Labas", start: 0.5, end: 1 },
          { text: "rytas", start: 1, end: 2 },
        ],
      },
    ];
    expect(voiceRanges(clips, 300, 30, isVoice)).toEqual([{ start: 45, end: 90 }]);
  });

  it("merges a short pause but keeps a long one", () => {
    const clips: AudioClip[] = [
      { id: "a", sfxId: "vo-a", from: 0, durationInFrames: 30 },
      { id: "b", sfxId: "vo-b", from: 40, durationInFrames: 30 },
      { id: "c", sfxId: "vo-c", from: 200, durationInFrames: 30 },
    ];
    expect(voiceRanges(clips, 300, 30, isVoice)).toEqual([
      { start: 0, end: 70 },
      { start: 200, end: 230 },
    ]);
  });

  it("ignores sound effects", () => {
    const clips: AudioClip[] = [{ id: "w", sfxId: "soft-whoosh", from: 0, durationInFrames: 20 }];
    expect(voiceRanges(clips, 300, 30, isVoice)).toEqual([]);
  });
});

describe("musicVolumeAt", () => {
  const speech = [{ start: 100, end: 200 }];

  it("plays at its own level away from the voice", () => {
    expect(musicVolumeAt(10, 300, speech, music)).toBeCloseTo(0.3);
  });

  it("ducks while the voice speaks", () => {
    expect(musicVolumeAt(150, 300, speech, music)).toBeCloseTo(0.1);
  });

  it("fades out at the end of the video", () => {
    const withFade = { ...music, fadeOutFrames: 30 };
    expect(musicVolumeAt(285, 300, [], withFade)).toBeCloseTo(0.15);
    expect(musicVolumeAt(300, 300, [], withFade)).toBe(0);
  });

  it("uses the defaults when nothing is set", () => {
    expect(musicVolumeAt(150, 300, [], { sfxId: "song" })).toBeCloseTo(MUSIC_DEFAULTS.volume);
  });
});
```

## 5. Komponentas – `src/video/BackgroundMusic.tsx` (naujas)

```tsx
import { useMemo } from "react";
import { Audio, useCurrentFrame, useVideoConfig } from "remotion";
import { getSfx } from "../registries/sfxRegistry";
import type { VideoProject } from "../schema/project";
import { musicVolumeAt, voiceRanges } from "../utils/music";

type BackgroundMusicProps = {
  project: VideoProject;
  duration: number;
};
// The track runs for the whole video: `loop` covers a song shorter than the
// video, the composition's own end cuts a longer one, and musicVolumeAt fades
// both ends and ducks under the voiceover.
export function BackgroundMusic({ project, duration }: BackgroundMusicProps) {
  // The video's own frame, not the track's: with `loop` Remotion restarts the
  // media's clock every lap, and ducking/fades must follow the video.
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const music = project.music;
  const speech = useMemo(
    () => voiceRanges(project.audioClips ?? [], duration, fps),
    [project.audioClips, duration, fps],
  );
  const src = music ? getSfx(music.sfxId)?.src : undefined;
  if (!music || !src) return null;
  return (
    <Audio
      src={src}
      loop
      startFrom={music.startFrom ?? 0}
      volume={musicVolumeAt(frame, duration, speech, music)}
      name="music"
    />
  );
}
```

`useMemo` turi būti prieš `return null`, nes React hook'ai negali būti po sąlyginio
grąžinimo.

Garsumas paduodamas kaip skaičius iš `useCurrentFrame()`, o ne kaip `volume={(f) => …}`
funkcija. Kai `loop` įjungtas, funkcijai perduodamas kadras gali skaičiuotis nuo
kiekvieno kartojimo pradžios, ir tada patylinimas bei užgesimas antrame rate atsidurtų
ne vietoje. Patikros 5 žingsnyje (render'e) pasiklausyk, ar dainai kartojantis
patylinimas vis dar sutampa su balsu.

## 6. Įdėti į video – `src/video/TikTokVideo.tsx`

Importas:

```ts
import { BackgroundMusic } from "./BackgroundMusic";
```

Ir po `<CaptionLayer project={project} />`:

```tsx
      <BackgroundMusic project={project} duration={duration} />
```

`duration` jau suskaičiuotas tame pačiame komponente (`projectDurationInFrames`), todėl
muzika ir video visada baigiasi tame pačiame kadre.

## 7. Store

`src/editor/state/projectStoreTypes.ts`, šalia `updateProjectCaptions`:

```ts
  updateProjectMusic: (music: VideoProject["music"]) => void;
```

`src/editor/state/projectStore.ts`, po `updateProjectCaptions(patch) { … },`:

```ts
  updateProjectMusic(music) {
    set((state) => ({
      project: { ...state.project, music },
    }));
  },
```

Čia perduodamas visas objektas, ne `patch`, nes `undefined` reiškia „be muzikos“.

## 8. Redaktorius – `src/editor/library/SoundLibrary.tsx`

**a)** Importuose prie `@mantine/core` pridėk `Slider`. Taip pat pridėk importą:

```ts
import { MUSIC_DEFAULTS } from "../../utils/music";
```

**b)** Į `sfxGroups` masyvą įrašyk `"music"` po `"voice"`. Tada įkėlimo formoje
(`UploadForm`) atsiras grupė „music“ ir sąrašuose bus matoma.

**c)** Nauja sekcija (įdėk virš `function UploadForm()`):

```tsx
function MusicSection() {
  const music = useProjectStore((s) => s.project.music);
  const updateProjectMusic = useProjectStore((s) => s.updateProjectMusic);
  // Re-renders when a track is uploaded; the registry holds the playable list.
  useCustomSfx();
  const tracks = sfxList.filter((s) => s.group === "music");

  function slider(label: string, field: "volume" | "duckVolume") {
    if (!music) return null;
    const value = music[field] ?? MUSIC_DEFAULTS[field];
    return (
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-editor-muted">
          <span>{label}</span>
          <span className="text-editor-text">{Math.round(value * 100)}%</span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(next) => updateProjectMusic({ ...music, [field]: Number(next) })}
          className="w-full"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
        Background music
      </div>
      <NativeSelect
        className="w-full mb-2"
        value={music?.sfxId ?? ""}
        onChange={(e) => {
          const sfxId = e.target.value;
          updateProjectMusic(sfxId ? { ...music, sfxId } : undefined);
        }}
      >
        <option value="">No music</option>
        {tracks.map((track) => (
          <option key={track.id} value={track.id}>
            {track.label}
          </option>
        ))}
      </NativeSelect>
      {tracks.length === 0 ? (
        <div className="text-[11px] text-editor-muted mb-2">
          Import a sound below with the group “music”.
        </div>
      ) : null}
      {slider("Volume", "volume")}
      {slider("Under the voice", "duckVolume")}
    </div>
  );
}
```

**d)** `SoundLibrary()` viduje, prieš `<DefaultsSection />`:

```tsx
      <MusicSection />
```

Slankiklio `onChange` kiekvienu judesiu įrašo pakeitimą į projektą. Tai tas pats kelias
kaip kitur redaktoriuje: `AutoSave` failą įrašo tik po 400 ms nuo paskutinio pakeitimo.

## 9. Dokumentacija

- `CLAUDE.md`, skyriuje „Sound“, pridėk pastraipą: muzika yra `project.music`, ne klipas;
  grupė `music`; ilgis = video ilgis (`loop` + `fadeOutFrames`); patylinimas pagal
  `audioClips[].words` (`src/utils/music.ts`).
- `docs/darbu-eile.md`: `- [ ] B9` → `- [x] B9`.
- `capabilities.ts` / vertimo lentelė: jei ten yra garso ar muzikos sąrašas, pažymėk,
  kad foninė muzika palaikoma.

## Patikra

1. `npx tsc --noEmit` – be klaidų.
2. `npm test` – žali, įskaitant naują `music.test.ts`.
3. `npm run dev` → Sound skirtukas → įkelk mp3 su grupe **music** → „Background music“
   sąraše pasirink jį.
4. Peržiūroje: muzika groja nuo pradžios, kalbant tyliau, pabaigoje užgęsta.
   Video, kuris ilgesnis už dainą, ją kartoja.
5. `npm run render:project -- db/projects/<failas>.json out/b9.mp4` – patikrink, ar
   muzika girdisi ir render'e. Tai patvirtina, kad `src` eina per `assetUrl`.

## Ko šiame punkte nedaryta (sąmoningai)

- **Įtaisyta muzikos biblioteka** (`music/` aplankas, sinchronizuojamas kaip `sfx/`).
  Jei jos reikės: `scripts/syncAssets.ts` → naujas šaltinis `music` →
  `generatedMusic` manifeste → `sfxRegistry` juos registruoja su grupe `music`.
  Kol muzikos nedaug, užtenka įkėlimo.
- **Muzikos klipo vieta laiko juostoje** (pradžia ne nuo 0, kelios dainos). Jei
  prireiktų, tai jau būtų `audioClips[]` su vėliavėle, o ne `project.music`.
- **Ritmo sinchronizacija** (kirpimai pagal bitą) – atskira didelė užduotis.
