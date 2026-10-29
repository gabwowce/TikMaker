# B4 ir B5 – gidas žingsnis po žingsnio

Kodą įklijuoji pati. Kiekvienas žingsnis: **ką darom** (paprastai), **kur**, **kodas**, **kaip patikrinti**.
Darykite B4 ir B5 atskirai – kiekvienas savo commitu (taip sutarta `darbu-eile.md`).

> ⚠️ Kita sesija (B2, B3) šiuo metu keičia tuos pačius du failus: `src/schema/capabilities.ts` ir
> `src/schema/scene.ts`. Mes juose keičiame **kitas eilutes**, tad konflikto neturėtų būti, bet
> geriausia pradėti, kai B2/B3 jau sucommitinti, arba bent jau neperrašyti jų pakeitimų.

---

## Kaip sistema sudėliota (trumpai, kad žingsniai turėtų prasmę)

Kiekvienas video yra **duomenys** (JSON failas `db/projects/…`). Kelias nuo duomenų iki vaizdo:

1. **Meniu** – `capabilities.ts`. Sąrašai „ką TikMaker moka“ (animacijos, fonai, vaizdinių tipai…).
   Iš čia renkasi redaktorius, ir vėliau rinksis agentas.
2. **Taisyklės** – `scene.ts` ir `visual.ts`. Apibrėžia, kokius laukus gali turėti scena ar vaizdinys.
   Jei JSON'e yra kas nors, ko čia nėra – projektas neatidaromas.
3. **Piešimas** – `src/video/…`. Komponentai, kurie iš duomenų padaro tai, ką matai kadre.
   Svarbiausi mums: `VisualsLayer` (išdėsto sluoksnius kadre) ir `AnimatedVisual` (vieną sluoksnį
   animuoja ir nupiešia).
4. **Redaktorius** – `src/editor/…`. Mygtukai ir laukai, kurie keičia tuos pačius duomenis.

Kiekviena nauja galimybė eina per tuos keturis aukštus iš eilės. Dėl to ir žingsniai visada tokia
tvarka: meniu → taisyklės → piešimas → redaktorius → patikra.

Gera žinia: **TypeScript pats parodo, ką pamiršai.** Po kiekvieno žingsnio paleidi
`npx tsc --noEmit` – jei kažkur raudona, ta vieta dar nežino apie naują dalyką.

---

# B4. Efektai elementams: šešėlis / švytėjimas / kontūras

### Idėja

Bet kuris sluoksnis scenoje (logotipas, paveikslėlis, video, kortelė…) gaus naują lauką
`effects` – sąrašą, pvz. `["shadow", "glow"]`.

Efektą dedame **ant sluoksnio, ne ant konkretaus paveikslėlio**, todėl jis iškart veiks su visais
vaizdinių tipais, nereikės kiekvieno komponento taisyti atskirai.

Naršyklė turi gatavą įrankį `drop-shadow` – jis meta šešėlį **pagal paveikslėlio formą**
(logotipo kontūrą), ne pagal kvadratą aplink jį. Iš jo padarome visus tris:

- **šešėlis** – vienas tamsus šešėlis žemyn;
- **švytėjimas** – oranžinis (mūsų akcento spalva) šešėlis į visas puses, be poslinkio;
- **kontūras** – keturi balti šešėliai be suliejimo, pastumti į keturias puses → atrodo kaip apvadas.

### 1 žingsnis. Meniu: kokie efektai egzistuoja

**Kur:** `src/schema/capabilities.ts`, po `kenBurnsPresetSchema` sąrašo (apie 65 eilutę).

```ts
// Effects a layer can wear (B4). One CSS filter, built in visualEffects.ts.
export const visualEffectSchema = z.enum(["shadow", "glow", "outline"]);
```

**Kodėl čia:** tai vienintelė vieta, kur gyvena „ką moka TikMaker“. Redaktorius iš šito sąrašo
parodys varneles, o agentas iš jo rinksis.

### 2 žingsnis. Taisyklės: sluoksnis gali turėti `effects`

**Kur:** `src/schema/scene.ts`.

a) Viršuje, prie importų iš `./capabilities`, abėcėlės tvarka pridėk `visualEffectSchema`:

```ts
  transitionPresetSchema,
  visualEffectSchema,
} from "./capabilities";
```

b) `positionedVisualSchema` viduje (tai vieno sluoksnio aprašas), po `kenBurnsSpeed` eilutės:

```ts
  kenBurnsSpeed: z.number().min(0.1).max(5).optional(),
  effects: z.array(visualEffectSchema).max(3).optional(),
```

`optional` reiškia: senų projektų tai nesugadins – jie tiesiog neturi efektų.

c) Failo apačioje, šalia `export type KenBurnsPreset = …`:

```ts
export type VisualEffect = z.infer<typeof visualEffectSchema>;
```

Tai „vardas“, kurį naudos kiti failai, kai norės pasakyti „čia efektas“.

**Patikra:** `npx tsc --noEmit` – turi būti be naujų klaidų (kol kas niekas lauko nenaudoja).

### 3 žingsnis. Receptas: iš efektų sąrašo → vienas filtras

**Kur:** naujas failas `src/video/visuals/visualEffects.ts`.

Šitas failas nieko nepiešia – jis tik paverčia `["shadow", "glow"]` į tekstą, kurį supranta
naršyklė. Spalvos imamos iš `tokens.ts` (taisyklė: spalvų nekoduojam ranka).

```ts
import type { VisualEffect } from "../../schema/scene";
import { colors } from "../typography/tokens";

// A layer's effects (B4) as one CSS filter. drop-shadow follows the artwork's
// own shape — a logo's outline, not its box. Sizes are canvas pixels: the
// filter sits inside the layer's scale, so each one is divided by it.
export function effectsFilter(
  effects: VisualEffect[] | undefined,
  scale = 1,
): string | undefined {
  if (!effects || effects.length === 0) return undefined;
  const px = (value: number) => `${value / scale}px`;
  const parts: string[] = [];
  if (effects.includes("outline")) {
    const line = colors.textPrimary;
    parts.push(
      `drop-shadow(${px(6)} 0 0 ${line})`,
      `drop-shadow(${px(-6)} 0 0 ${line})`,
      `drop-shadow(0 ${px(6)} 0 ${line})`,
      `drop-shadow(0 ${px(-6)} 0 ${line})`,
    );
  }
  if (effects.includes("glow")) {
    parts.push(
      `drop-shadow(0 0 ${px(18)} ${colors.accent})`,
      `drop-shadow(0 0 ${px(42)} ${colors.accent})`,
    );
  }
  if (effects.includes("shadow")) {
    parts.push(`drop-shadow(0 ${px(18)} ${px(36)} rgba(0, 0, 0, 0.55))`);
  }
  return parts.join(" ");
}
```

**Du dalykai, kuriuos verta suprasti:**

- **Tvarka svarbi.** Filtrai klojami vienas ant kito: pirma apvadas, tada švytėjimas, tada šešėlis.
  Taip šešėlis krenta nuo *jau apvesto* logotipo, o ne apvadas apibrėžia šešėlį.
- **Kodėl dalinam iš `scale`.** Sluoksnis kadre gali būti padidintas, pvz., 2,5 karto. Jei
  šešėlis būtų 18 px, jis irgi išaugtų 2,5 karto, ir mažas logotipas turėtų ploną šešėlį, o
  didelis – storą. Padalinus visi elementai gauna vienodo storio efektą, kad ir kokio dydžio.
  (Tai ta pati problema, kuri `CLAUDE.md` aprašyta prie „A layer's scale must not scale its own
  animation“.)

### 4 žingsnis. Piešimas: uždėti filtrą ant sluoksnio

**Kur:** `src/video/typography/AnimatedVisual.tsx`.

a) Importai viršuje – pridėk du:

```ts
import type {
  EntrancePreset,
  ExitPreset,
  KenBurnsPreset,
  VisualEffect,
} from "../../schema/scene";
```
```ts
import { VisualRenderer } from "../visuals/VisualRenderer";
import { effectsFilter } from "../visuals/visualEffects";
```

b) `AnimatedVisualProps` tipe, po `kenBurnsSpeed?: number;`:

```ts
  effects?: VisualEffect[];
```

c) Funkcijos parametruose (`export function AnimatedVisual({ … })`), po `kenBurnsSpeed,`:

```ts
  effects,
```

d) Apačioje, `return (` dalyje, `<div style={{ … }}>` – pridėk vieną eilutę:

```tsx
      style={{
        ...style,
        opacity: enterResult.opacity * exitResult.opacity,
        transform: transform || undefined,
        filter: effectsFilter(effects, ownScale),
      }}
```

`ownScale` – tai būtent tas sluoksnio padidinimas iš 3 žingsnio paaiškinimo.

### 5 žingsnis. Piešimas: perduoti sluoksnio efektus

**Kur:** `src/video/typography/VisualsLayer.tsx`, ten, kur kviečiamas `<AnimatedVisual`, po
`kenBurnsSpeed={entry.kenBurnsSpeed}`:

```tsx
      effects={entry.effects}
```

`VisualsLayer` eina per visus scenos sluoksnius ir kiekvieną atiduoda `AnimatedVisual`. Iki šiol
jis perdavė viską, išskyrus efektus – dabar perduoda ir juos.

**Patikra:** `npx tsc --noEmit`. Tada ranka į kokį nors projektą JSON'e (pvz., kopijoje) prie
vieno sluoksnio įrašyk `"effects": ["glow"]` ir pažiūrėk redaktoriuje – logotipas turi švytėti.

### 6 žingsnis. „Keliaujantys“ sluoksniai (carry)

Kai vienas logotipas keliauja per kelias scenas (`link.groupId`), jį piešia **ne** `VisualsLayer`,
o atskiras `LinkedVisual`. Jei šito žingsnio nepadarysi, keliaujantis logotipas efekto neturės.

a) **Kur:** `src/utils/visualLinks.ts`.

Importas iš `../schema/scene` – pridėk `VisualEffect` prie esamų tipų (ten jau importuojami
`EntrancePreset` ir kt.).

`LinkMotion` tipe, po `kenBurnsSpeed?: number;`:

```ts
  effects?: VisualEffect[];
```

`layerSources` funkcijoje, `motionIn: { … }` viduje, po `kenBurnsSpeed: entry.kenBurnsSpeed,`:

```ts
        effects: entry.effects,
```

Kodėl `motionIn`: grandinės išvaizdą (atsiradimą, judesį) duoda **pirmoji** scena. Efektas – tos
pačios rūšies dalykas, tad jis irgi imamas iš pirmos.

b) **Kur:** `src/video/typography/LinkedVisual.tsx`.

Importas:

```ts
import { effectsFilter } from "../visuals/visualEffects";
```

Apačioje, `<div className={`absolute`} style={{ … }}>` – po `opacity,`:

```tsx
          filter: effectsFilter(motion.effects, pose.scale),
```

### 7 žingsnis. Redaktorius: trys varnelės

**Kur:** `src/editor/timeline/ObjectEffects.tsx`.

a) Importai viršuje:

```ts
import { Checkbox, NativeSelect } from "@mantine/core";
import {
  entrancePresetSchema,
  exitPresetSchema,
  kenBurnsPresetSchema,
  visualEffectSchema,
} from "../../schema/capabilities";
import type {
  EntrancePreset,
  ExitPreset,
  KenBurnsPreset,
  VisualEffect,
} from "../../schema/scene";
```

b) Naujas komponentas – įklijuok po `LoopEffectEditor` funkcijos:

```tsx
export function VisualEffectsEditor({
  effects,
  onChange,
}: {
  effects?: VisualEffect[];
  onChange: (patch: { effects?: VisualEffect[] }) => void;
}) {
  return (
    <Checkbox.Group
      label="Look"
      value={effects ?? []}
      onChange={(value) =>
        onChange({
          effects: value.length ? (value as VisualEffect[]) : undefined,
        })
      }
      className="mb-3"
    >
      <div className="flex gap-3 mt-1">
        {visualEffectSchema.options.map((effect) => (
          <Checkbox
            key={effect}
            value={effect}
            label={friendlyEffect(effect)}
          />
        ))}
      </div>
    </Checkbox.Group>
  );
}
```

Atkreipk dėmesį: varnelių sąrašas imamas **iš meniu** (`visualEffectSchema.options`), ne
surašytas ranka. Jei kada pridėsi ketvirtą efektą 1 žingsnyje, varnelė atsiras pati.

Kai nuimi visas varneles, išsaugom `undefined`, ne tuščią sąrašą – taip JSON'e nelieka
`"effects": []` šiukšlės.

c) **Kur:** `src/editor/timeline/TimelineObjectPanel.tsx`.

Importe iš `./ObjectEffects` (apie 36 eilutę) pridėk `VisualEffectsEditor`.

Ieškok vietos, kur sluoksniui (`visual`) piešiamas `<LoopEffectEditor` (apie 664 eilutę), ir
po juo įklijuok:

```tsx
        <VisualEffectsEditor effects={visual.effects} onChange={update} />
```

`update` – tai jau esanti funkcija, kuri įrašo pakeitimą į šitą sluoksnį ir per AutoSave į failą.

### 8 žingsnis. Patikra

1. `npx tsc --noEmit` – be naujų klaidų.
2. `npm test`.
3. `npm run dev` → atidaryk projektą → laiko juostoje pasirink vaizdinį (logotipą ar prop'ą) →
   Effects skiltyje „Look“ – trys varnelės. Pažymėk po vieną ir žiūrėk peržiūroje:
   - **shadow** – šešėlis krenta žemyn, pagal logotipo formą;
   - **glow** – oranžinis švytėjimas aplink;
   - **outline** – baltas apvadas.
4. Padidink sluoksnį (Scale) – efekto storis turi likti panašus (tai 3 žingsnio dalyba).
5. Atidaryk projekto JSON – prie sluoksnio turi atsirasti `"effects": ["glow"]`.
6. Jei turi keliaujantį logotipą (carry) – pažymėk efektą **pirmoje** scenoje ir pažiūrėk, ar
   jis lieka per visą kelionę.
7. `npm run studio` – patikrink, kad ir render'yje atrodo taip pat.

### 9 žingsnis. Uždaryti punktą

- `knowledge/shared/analysis-to-tikmaker.json`, skiltis `visualEffect`: prie `glow`, `shadow`,
  `outline` pakeisk `"status"` į `"yes"`, `"tikmaker"` – pvz., `"layer effects: glow"`, ir ištrink
  `"todo": "B4"`. (Ten yra ir antras `glow` / `outline` – po `emphasisStyle`, tai **teksto**
  paryškinimas. Jo B4 neliečia – tą palik.)
- `docs/darbu-eile.md`: `- [x] B4`.
- Commitas, pvz.: `B4: sluoksniams šešėlis, švytėjimas, kontūras`.

---

# B4.2 Papildymas: tikras kontūras, spalva ir permatomumas

### Kodėl kontūras atrodė kaip švytėjimas

Kodas buvo įklijuotas teisingai – kaltas pats būdas. `drop-shadow` kopijuoja **viską, kas
nupiešta**, įskaitant pusiau permatomas vietas. Naršyklės / ekrano / telefono kortelė jau turi
savo didelį minkštą šešėlį (`box-shadow: 0 40px 80px …`). Mūsų „kontūras“ nukopijavo ir tą
šešėlį, tik baltai – todėl gavosi balta migla, o ne linija. Su logotipu be šešėlio būtų atrodę
gerai, bet su kortelėmis – ne.

### Kaip padarom tikrą liniją

Vietoj keturių šešėlių naudojam mažą **SVG filtrą** – tai naršyklės „receptas“ iš kelių
žingsnių, kurį CSS gali pritaikyti elementui (`filter: url(#vardas)`):

1. paimam tik elemento **formą** (be spalvų);
2. išmetam pusiau permatomas vietas – čia ir dingsta kortelės minkštas šešėlis;
3. formą **išpučiam** 6 px į visas puses;
4. išpūstą formą nudažom pasirinkta spalva ir permatomumu;
5. originalą dedam **ant viršaus** – matosi tik išsikišęs kraštelis, t. y. linija.

### Spalva ir permatomumas

Kiekvienas efektas taps ne žodžiu, o mažu objektu:

```json
"effects": [
  { "type": "outline", "color": "#FFFFFF", "opacity": 1 },
  { "type": "glow" }
]
```

`color` ir `opacity` neprivalomi. Jei jų nėra, imama **prekės ženklo numatytoji** reikšmė
(kontūras – balta, švytėjimas – akcento spalva, šešėlis – juoda). Tai svarbu ateičiai: kai spalvos
ateis iš workspace, efektai be savo spalvos persidažys kartu su ženklu, o efektai su įrašyta
spalva liks tokie, kokius parinkai.

### 0 žingsnis. Pirma išvalyk seną testą

Duomenų forma keičiasi (`"outline"` → `{ "type": "outline" }`). Senos formos įrašas po
pakeitimo **nepraeis taisyklių**, ir visas projektas dings iš sąrašo (žr. `CLAUDE.md` – „one
value outside that range failed the whole parse“).

Šiuo metu toks įrašas yra vienas: `db/projects/project-mtii3v8d.json`, apie 226 eilutę. Prieš
pradėdama redaktoriuje **nuimk varnelę „outline“** (AutoSave lauką ištrins) arba ranka ištrink
tas tris eilutes:

```json
            "effects": [
              "outline"
            ],
```

### 1 žingsnis. Taisyklės: efektas = tipas + spalva + permatomumas

**Kur:** `src/schema/scene.ts`.

Virš `const positionedVisualSchema = z.object({` įklijuok:

```ts
const visualEffectEntrySchema = z.object({
  type: visualEffectSchema,
  color: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
});
```

`positionedVisualSchema` viduje `effects` eilutę pakeisk:

```ts
  effects: z.array(visualEffectEntrySchema).max(3).optional(),
```

Apačioje `VisualEffect` tipą pakeisk dviem:

```ts
export type VisualEffectType = z.infer<typeof visualEffectSchema>;
export type VisualEffect = z.infer<typeof visualEffectEntrySchema>;
```

`VisualEffectType` – tik žodis (`"glow"`), `VisualEffect` – visas objektas su spalva.

`capabilities.ts` **nekeičiam** – meniu vis dar tas pats: shadow, glow, outline.

### 2 žingsnis. Receptas perrašomas

Kontūrui dabar reikia ne tik teksto, bet ir mažo SVG gabalo puslapyje, o tai jau React dalis.
Todėl failas keičia galūnę: **ištrink** `src/video/visuals/visualEffects.ts` ir **sukurk**
`src/video/visuals/visualEffects.tsx` (importų kituose failuose keisti nereikės – juose galūnė
nerašoma).

```tsx
import { useId } from "react";
import type { VisualEffect, VisualEffectType } from "../../schema/scene";
import { colors } from "../typography/tokens";

// A layer's effects (B4): shadow, glow and outline, each with its own colour
// and opacity. Unset = the brand default below, so a layer follows the brand
// colours unless the author picked one.
export const EFFECT_DEFAULTS: Record<
  VisualEffectType,
  { color: string; opacity: number }
> = {
  outline: { color: colors.textPrimary, opacity: 1 },
  glow: { color: colors.accent, opacity: 0.9 },
  shadow: { color: "#000000", opacity: 0.55 },
};
const OUTLINE_WIDTH = 6;

function resolveEffect(
  effects: VisualEffect[] | undefined,
  type: VisualEffectType,
) {
  const effect = effects?.find((item) => item.type === type);
  if (!effect) return undefined;
  return {
    color: effect.color ?? EFFECT_DEFAULTS[type].color,
    opacity: effect.opacity ?? EFFECT_DEFAULTS[type].opacity,
  };
}

function tint(color: string, opacity: number) {
  return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}

// The CSS filter for a layer plus the SVG the outline needs. Sizes are canvas
// pixels: the filter sits inside the layer's scale, so each is divided by it.
// The outline is an SVG filter, not drop-shadows: it keeps only the solid
// shape (a card's own soft box-shadow is dropped), grows it and paints it
// behind the original — a line, not a haze.
export function useVisualEffects(
  effects: VisualEffect[] | undefined,
  scale = 1,
) {
  const outlineId = `outline-${useId().replace(/:/g, "")}`;
  const px = (value: number) => value / scale;
  const outline = resolveEffect(effects, "outline");
  const glow = resolveEffect(effects, "glow");
  const shadow = resolveEffect(effects, "shadow");
  const parts: string[] = [];
  if (outline) parts.push(`url(#${outlineId})`);
  if (glow) {
    const color = tint(glow.color, glow.opacity);
    parts.push(
      `drop-shadow(0 0 ${px(18)}px ${color})`,
      `drop-shadow(0 0 ${px(42)}px ${color})`,
    );
  }
  if (shadow) {
    const color = tint(shadow.color, shadow.opacity);
    parts.push(`drop-shadow(0 ${px(18)}px ${px(36)}px ${color})`);
  }
  const defs = outline ? (
    <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
      <filter
        id={outlineId}
        x="-10%"
        y="-10%"
        width="120%"
        height="120%"
        colorInterpolationFilters="sRGB"
      >
        <feComponentTransfer in="SourceAlpha" result="shape">
          <feFuncA type="discrete" tableValues="0 0 0 1" />
        </feComponentTransfer>
        <feMorphology
          in="shape"
          operator="dilate"
          radius={px(OUTLINE_WIDTH)}
          result="grown"
        />
        <feFlood floodColor={outline.color} floodOpacity={outline.opacity} />
        <feComposite in2="grown" operator="in" result="line" />
        <feMerge>
          <feMergeNode in="line" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </svg>
  ) : null;
  return { filter: parts.length ? parts.join(" ") : undefined, defs };
}
```

**Kas čia nauja, paprastai:**

- `EFFECT_DEFAULTS` – numatytosios spalvos vienoje vietoje. Redaktorius jas irgi parodys kaip
  užuominą („auto · #FFFFFF“).
- `tint` – „ši spalva, bet X % matoma“. Naršyklė moka pati sumaišyti spalvą su permatomumu
  (`color-mix`), tad nereikia skaičiuoti hex → rgba.
- `useId()` – kiekvienam sluoksniui unikalus filtro vardas. Be jo du sluoksniai su skirtingos
  spalvos kontūrais naudotų tą patį filtrą, ir vienas „pavogtų“ kito spalvą. (Dvitaškius
  išmetam, nes React'o id atrodo kaip `:r3:`, o CSS `url(#…)` jų nemėgsta.)
- SVG filtro eilutės – tai tie patys 5 žingsniai iš aukščiau:
  `feComponentTransfer` = 1–2 (forma, be pusiau permatomų vietų), `feMorphology dilate` = 3
  (išpūsti), `feFlood` + `feComposite` = 4 (nudažyti), `feMerge` = 5 (originalas ant viršaus).
- `tableValues="0 0 0 1"` – riba: kas mažiau nei ~75 % matoma, išmetama. Kortelių šešėliai
  yra 45–50 %, tad jie dingsta, o pati kortelė (100 %) lieka.
- Funkcijos vardas prasideda `use…`, nes viduje naudoja `useId` – tai React taisyklė: tokias
  funkcijas kviečiam komponento viršuje, ne `if` viduje.

### 3 žingsnis. `AnimatedVisual` naudoja naują receptą

**Kur:** `src/video/typography/AnimatedVisual.tsx`.

Importą pakeisk:

```ts
import { useVisualEffects } from "../visuals/visualEffects";
```

Po eilute `const kenBurnsStyle = computeKenBurns(…);` (visu jos bloku) pridėk:

```ts
  const look = useVisualEffects(effects, ownScale);
```

`return` dalyje `filter` eilutę pakeisk ir prieš `<VisualRenderer` įdėk `{look.defs}`:

```tsx
        filter: look.filter,
      }}
    >
      {look.defs}
      <VisualRenderer visual={visual} />
```

### 4 žingsnis. `LinkedVisual` – tas pats

**Kur:** `src/video/typography/LinkedVisual.tsx`.

Importą pakeisk:

```ts
import { useVisualEffects } from "../visuals/visualEffects";
```

Po eilute `const pose = poseAt(group, frame);`:

```ts
  const look = useVisualEffects(motion.effects, pose.scale);
```

`style` viduje `filter` eilutę pakeisk į `filter: look.filter,`, ir prieš `<VisualRenderer`:

```tsx
        {look.defs}
        <VisualRenderer visual={visual} />
```

`visualLinks.ts` keisti nereikia – ten tipas `VisualEffect[]`, ir jis pats „pasikeitė“ 1 žingsnyje.

### 5 žingsnis. Spalvos pasirinkimas – iškeliam į vieną vietą

Teksto nustatymuose jau yra spalvos pasirinkimas (spalvų kvadratėliai + hex laukas), bet jis
įrašytas tiesiai į `TypographyFields`. Jei dabar tą patį nukopijuotume į efektus, turėtume dvi
kopijas, kurios su laiku išsiskirtų (`CLAUDE.md`: „there is one place each concept lives“).
Todėl jį **iškeliam** į bendrą valdiklių failą ir naudojam abiejose vietose.

a) **Kur:** `src/editor/timeline/ObjectControls.tsx`, failo gale:

```tsx
export const COLOR_SWATCHES = [
  "#FFFFFF",
  "#171717",
  "#FF7024",
  "#FFD166",
  "#4ADE80",
  "#60A5FA",
  "#F472B6",
];

export function ColorField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string | undefined;
  placeholder: string;
  onChange: (color: string | undefined) => void;
}) {
  return (
    <div className="mb-3">
      <div className="text-[10px] text-editor-muted uppercase [letter-spacing:.05em]">
        {label}
      </div>
      <div className="flex gap-1.5 items-center flex-wrap">
        {COLOR_SWATCHES.map((swatch) => (
          <Button
            variant="default"
            key={swatch}
            aria-label={swatch}
            onClick={() => onChange(swatch)}
            className={`w-5.5 ${value?.toUpperCase() === swatch ? "[border:2px_solid_#FF7024]" : "[border:2px_solid_rgba(255,255,255,0.18)]"}`}
            style={{
              background: swatch,
            }}
          />
        ))}
        <TextInput
          value={value ?? ""}
          placeholder={placeholder}
          spellCheck={false}
          onChange={(event) => {
            const next = event.target.value.trim();
            onChange(next === "" ? undefined : next);
          }}
          className="w-24"
        />
      </div>
    </div>
  );
}
```

(`Button` ir `TextInput` tame faile jau importuoti.)

b) **Kur:** `src/editor/timeline/ObjectTextSettings.tsx`.

- Ištrink visą `export const TEXT_COLOR_SWATCHES = [ … ];` bloką (23–31 eil.).
- Importą `import { Field, SliderField } from "./ObjectControls";` pakeisk į
  `import { ColorField, Field, SliderField } from "./ObjectControls";`
- `TypographyFields` viduje visą `<div className="mb-3">` bloką, kuris prasideda `Color`
  antrašte (107–135 eil., nuo `<div className="mb-3">` iki jo uždarančio `</div>`), pakeisk į:

```tsx
      <ColorField
        label="Color"
        value={color}
        placeholder={defaultColorHint}
        onChange={(next) => onChange({ color: next })}
      />
```

Teksto spalva turi veikti lygiai kaip anksčiau – tai patikrinsim 7 žingsnyje.

### 6 žingsnis. Efektų redaktorius: varnelė + spalva + permatomumas

**Kur:** `src/editor/timeline/ObjectEffects.tsx`.

Importai:

```ts
import type {
  EntrancePreset,
  ExitPreset,
  KenBurnsPreset,
  VisualEffect,
  VisualEffectType,
} from "../../schema/scene";
import { EFFECT_DEFAULTS } from "../../video/visuals/visualEffects";
import { ColorField, DurationSlider, SliderField } from "./ObjectControls";
```

Visą `VisualEffectsEditor` funkciją pakeisk:

```tsx
export function VisualEffectsEditor({
  effects,
  onChange,
}: {
  effects?: VisualEffect[];
  onChange: (patch: { effects?: VisualEffect[] }) => void;
}) {
  const list = effects ?? [];
  function save(next: VisualEffect[]) {
    onChange({ effects: next.length ? next : undefined });
  }
  function change(type: VisualEffectType, patch: Partial<VisualEffect>) {
    save(list.map((item) => (item.type === type ? { ...item, ...patch } : item)));
  }
  return (
    <div className="mb-3">
      <div className="text-[10px] text-editor-muted uppercase [letter-spacing:.05em] mb-1.5">
        Look
      </div>
      {visualEffectSchema.options.map((type) => {
        const effect = list.find((item) => item.type === type);
        const defaults = EFFECT_DEFAULTS[type];
        return (
          <div key={type} className="mb-2">
            <Checkbox
              label={friendlyEffect(type)}
              checked={Boolean(effect)}
              onChange={(event) =>
                save(
                  event.currentTarget.checked
                    ? [...list, { type }]
                    : list.filter((item) => item.type !== type),
                )
              }
            />
            {effect ? (
              <div className="pl-6 pt-2">
                <ColorField
                  label="Color"
                  value={effect.color}
                  placeholder={`auto · ${defaults.color}`}
                  onChange={(color) => change(type, { color })}
                />
                <SliderField
                  label="Opacity"
                  value={Math.round((effect.opacity ?? defaults.opacity) * 100)}
                  min={0}
                  max={100}
                  step={1}
                  decimals={0}
                  suffix="%"
                  onChange={(value) => change(type, { opacity: value / 100 })}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
```

**Kaip tai veikia:**

- Varnelė uždėta → į sąrašą įdedam `{ type }` (be spalvos = numatytoji). Nuimta → išmetam.
- Spalva ir permatomumas atsiranda **tik po uždėta varnele** – kol efektas išjungtas, nėra ką
  dažyti.
- `change` pakeičia tik vieną efektą, kitų nelietęs.
- Permatomumas redaktoriuje rodomas 0–100 %, o saugomas 0–1 (taip patogiau receptui).

`TimelineObjectPanel.tsx` keisti nereikia – ten jau `<VisualEffectsEditor effects=… />`.

### 7 žingsnis. Patikra

1. `npx tsc --noEmit` – be naujų klaidų.
2. `npm test`.
3. `npm run dev` → tas pats projektas su naršyklės kortele:
   - **outline** → turi būti **plona aiški linija** aplink kortelę, be baltos miglos;
   - pakeisk spalvą į oranžinę, permatomumą į 50 % – linija oranžinė ir pusiau permatoma;
   - išvalyk hex lauką – grįžta į „auto“ (baltą).
4. Tas pats su logotipu (prop'u) – linija turi sekti logotipo formą, ne kvadratą.
5. **glow** ir **shadow** – spalva ir permatomumas keičiasi.
6. Du sluoksniai su skirtingos spalvos kontūrais vienoje scenoje – kiekvienas savo spalvos
   (tai `useId` patikra).
7. Teksto eilutės **Color** laukas veikia kaip anksčiau (5 žingsnio patikra).
8. Projekto JSON'e: `"effects": [{ "type": "outline", "color": "#FF7024", "opacity": 0.5 }]`.
9. `npm run studio` – render'yje atrodo taip pat.

Po to – 9 žingsnis iš viršaus (analysis-to-tikmaker.json, darbu-eile `[x]`, commitas).

---

# B5. Kalbančios galvos komponentas

### Idėja

Naujas vaizdinio tipas **`talking-head`**: tavo nufilmuotas (arba DI sugeneruotas) video su
veidu ir **padėtis** iš sąrašo:

| Padėtis | Kaip atrodo |
|---|---|
| `full` | visas ekranas |
| `top` | viršutinė kadro pusė |
| `bottom` | apatinė kadro pusė |
| `circle-tl`, `circle-tr`, `circle-bl`, `circle-br` | apskritimas viename iš 4 kampų (top/bottom + left/right) |

**Kodėl padėtis yra sąrašas, o ne laisvas x/y?** Nes „pusė ekrano“ ir „visas ekranas“
priklauso nuo viso kadro, ne nuo saugios zonos. Sistema jau turi tokią rūšį – **full-bleed**
vaizdiniai (`corner-props`, orbitos diagrama): jie gauna visą kadrą ir patys žino, kur
atsistoti. Kalbanti galva bus trečia tokia. Antras privalumas – agentui lengva rinktis iš 7
žodžių, o ne skaičiuoti koordinates.

**Kodėl ne tiesiog naujas `recording` rėmelis?** `recording` gyvena saugioje zonoje ir jo
vietą valdo x/y. Kalbanti galva – kitokia forma (glaudžiasi prie kadro kraštų), o ir analizėje tai
atskiras elementas (`talking-head`), tad agentas turės jį rasti tuo pačiu vardu.

Video grojimą **pernaudojam** – `ScreenRecording` jau moka groti klipą, apkirpti ir pan. Mes tik
apgaubiam jį forma ir padėtimi.

### 1 žingsnis. Meniu

**Kur:** `src/schema/capabilities.ts`.

a) Naujas sąrašas – po `screenAspectSchema`:

```ts
// Where a talking head (B5) sits. Full-bleed: placed against the whole frame.
export const talkingHeadPlacementSchema = z.enum([
  "full",
  "top",
  "bottom",
  "circle-tl",
  "circle-tr",
  "circle-bl",
  "circle-br",
]);
```

b) `visualTypesByGroup` – grupėje `media` pridėk naują tipą:

```ts
  media: ["recording", "talking-head"], // own video or screen recording, own face
```

### 2 žingsnis. Taisyklės

**Kur:** `src/schema/visual.ts`. Šitas failas turi **du** aprašus tam pačiam dalykui: viršuje
TypeScript tipą `VisualConfig` (kad redaktorius žinotų laukus), apačioje Zod schemą (kuri tikrina
JSON). Abu reikia papildyti – jei pamirši vieną, `tsc` parodys.

a) Importas viršuje:

```ts
import { screenAspectSchema, talkingHeadPlacementSchema } from "./capabilities";
```

ir po importais:

```ts
export type TalkingHeadPlacement = z.infer<typeof talkingHeadPlacementSchema>;
```

b) `VisualConfig` tipe, iškart po `recording` bloko (jis baigiasi `tabs?: string[]; }`):

```ts
  | {
      type: "talking-head";
      src: string;
      placement: TalkingHeadPlacement;
      startFrom?: number;
      endAt?: number;
      playbackRate?: number;
    }
```

c) Zod schemoje, po `z.literal("recording")` objekto:

```ts
    z.object({
      type: z.literal("talking-head"),
      src: z.string(),
      placement: talkingHeadPlacementSchema.default("circle-bl"),
      startFrom: z.number().min(0).optional(),
      endAt: z.number().min(0).optional(),
      playbackRate: z.number().positive().optional(),
    }),
```

**Kodėl numatyta `circle-bl` (apačia kairėje)?** Dešinėje TikTok piešia savo mygtukus (širdelė,
komentarai), tad apačia dešinėje dažniausiai uždengta.

### 3 žingsnis. Komponentas

**Kur:** naujas failas `src/video/visuals/media/TalkingHead.tsx`.

```tsx
import type { CSSProperties } from "react";
import { AbsoluteFill } from "remotion";
import type { TalkingHeadPlacement } from "../../../schema/visual";
import { colors, safeArea, videoDefaults } from "../../typography/tokens";
import { ScreenRecording } from "./ScreenRecording";

// A face on camera (B5). Full-bleed like corner-props: it places itself
// against the whole frame, so the layer's x/y/scale do nothing here.
const CIRCLE = 360;
const RING = 8;

function boxFor(placement: TalkingHeadPlacement): CSSProperties {
  const { width, height } = videoDefaults;
  if (placement === "full") return { left: 0, top: 0, width, height };
  if (placement === "top") return { left: 0, top: 0, width, height: height / 2 };
  if (placement === "bottom")
    return { left: 0, top: height / 2, width, height: height / 2 };
  const right = placement.endsWith("r");
  const bottom = placement.startsWith("circle-b");
  return {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: "50%",
    border: `${RING}px solid ${colors.accent}`,
    left: right ? undefined : safeArea.left,
    right: right ? safeArea.right : undefined,
    top: bottom ? undefined : safeArea.top,
    bottom: bottom ? safeArea.bottom : undefined,
  };
}

type TalkingHeadProps = {
  src: string;
  placement: TalkingHeadPlacement;
  startFrom?: number;
  endAt?: number;
  playbackRate?: number;
};
export function TalkingHead({ placement, ...clip }: TalkingHeadProps) {
  return (
    <AbsoluteFill>
      <div className="absolute overflow-hidden" style={boxFor(placement)}>
        <ScreenRecording {...clip} fit="cover" />
      </div>
    </AbsoluteFill>
  );
}
```

**Ką čia daro kiekviena dalis, paprastai:**

- `boxFor` – „kur ir kokio dydžio dėžutė“. Visas ekranas = 1080×1920, pusė = 1080×960
  viršuje arba apačioje. Apskritimas = kvadratas su `borderRadius: 50%` (taip kvadratas tampa
  apskritimu) ir oranžiniu žiedu.
- Apskritimo atstumai nuo kraštų – **saugi zona** iš `tokens.ts` (tie patys 130 px šonuose,
  220 viršuje, 500 apačioje, kaip tekstui). Taip veidas neatsiduria po TikTok mygtukais ar
  aprašymu.
- `overflow-hidden` – nukerpa video kampus pagal apskritimą.
- `fit="cover"` – video užpildo visą dėžutę ir apkerpamas, o ne sumažinamas su juodais kraštais.
  Todėl tinka ir horizontalus, ir vertikalus filmukas.
- `...clip` – visi kiti laukai (`src`, `startFrom`…) tiesiai perduodami grotuvui.

### 4 žingsnis. Prijungti prie piešimo

a) **Kur:** `src/video/visuals/VisualRenderer.tsx` – „skirstytuvas“, kuris pagal `type` parenka
komponentą.

Importas (abėcėlės tvarka, prie kitų `./media/…`):

```ts
import { TalkingHead } from "./media/TalkingHead";
```

Po visu `case "recording": { … }` bloku:

```tsx
    case "talking-head":
      return (
        <TalkingHead
          src={visual.src}
          placement={visual.placement}
          startFrom={visual.startFrom}
          endAt={visual.endAt}
          playbackRate={visual.playbackRate}
        />
      );
```

b) **Kur:** `src/video/visuals/isFullBleed.ts` – čia sąrašas „kas gauna visą kadrą“. Prieš
`return false;`:

```ts
  if (visual.type === "talking-head") return true;
```

c) **Kur:** `src/video/layout/visualMetrics.ts` – kiekvienas vaizdinys čia deklaruoja savo dydį,
kad automatinis išdėstymas žinotų, kiek vietos jis užima. Šalia `case "corner-props":`:

```ts
    case "corner-props":
    case "talking-head":
      return { width: 1080, height: 1920 };
```

(Be šito jis gautų „numatytą“ 400×400 ir išdėstymas meluotų.)

### 5 žingsnis. Visuals bibliotekoje – naujas šablonas

**Kur:** `src/registries/visualTemplateRegistry.ts`, po `recording-phone` įrašo:

```ts
  {
    id: "talking-head",
    category: "media",
    label: "Talking Head",
    description:
      "Your face on camera — full screen, half the frame, or a circle in a corner.",
    build: () => ({
      type: "talking-head",
      src: "assets/recordings/placeholder.mp4",
      placement: "circle-bl",
    }),
  },
```

Po šito redaktoriaus Visuals skiltyje „Screens & Media“ atsiras nauja kortelė su tikra peržiūra.

### 6 žingsnis. Redaktorius: video ir padėties pasirinkimas

a) **Kur:** `src/editor/inspector/RecordingFields.tsx`.

Importas viršuje:

```ts
import {
  screenAspectSchema,
  talkingHeadPlacementSchema,
} from "../../schema/capabilities";
```

Prieš paskutinį `return null;` įklijuok:

```tsx
  if (visual.type === "talking-head") {
    return (
      <div className="flex flex-col gap-2">
        <ImportPicker
          kind="video"
          src={visual.src}
          onChange={(src) => onChange({ ...visual, src })}
        />
        <div className="text-[10px] text-editor-muted">Where the face sits</div>
        <NativeSelect
          className="w-full"
          value={visual.placement}
          onChange={(e) =>
            onChange({
              ...visual,
              placement: e.target.value as typeof visual.placement,
            })
          }
        >
          {talkingHeadPlacementSchema.options.map((placement) => (
            <option key={placement} value={placement}>
              {PLACEMENT_LABELS[placement]}
            </option>
          ))}
        </NativeSelect>
      </div>
    );
  }
```

O failo apačioje (už funkcijos ribų):

```ts
const PLACEMENT_LABELS: Record<string, string> = {
  full: "full screen",
  top: "top half",
  bottom: "bottom half",
  "circle-tl": "circle · top left",
  "circle-tr": "circle · top right",
  "circle-bl": "circle · bottom left",
  "circle-br": "circle · bottom right (under TikTok buttons)",
};
```

`ImportPicker` – tas pats „įkelk savo video“ laukas, kurį naudoja `recording`. Nieko naujo
nerašom – pernaudojam.

b) **Kur:** `src/editor/inspector/VisualFieldsEditor.tsx` – pasakom, kad ir `talking-head`
laukus rodo tas pats failas:

```tsx
    case "recording":
    case "talking-head":
      return <RecordingFields visual={visual} onChange={onChange} />;
```

c) Neprivaloma, bet gražu – kad laiko juostoje būtų matyti video miniatiūra ir veiktų „pakeisti
failą“ meniu:

- `src/editor/timeline/visualTimelinePreview.ts`:
  ```ts
    if (visual.type === "recording" || visual.type === "talking-head")
      return { src: visual.src, video: true, label: visual.type };
  ```
- `src/editor/inspector/AssetSelect.tsx`, funkcijoje `assetKeyOf`:
  ```ts
    if (
      visual.type === "image" ||
      visual.type === "recording" ||
      visual.type === "talking-head"
    ) {
  ```

### 7 žingsnis. Patikra

1. `npx tsc --noEmit` – jei kur raudona, tai vieta, kuri dar „nežino“ apie `talking-head`
   (dažniausiai pamiršta viena iš dviejų `visual.ts` vietų).
2. `npm test`.
3. `npm run dev` → Visuals → Screens & Media → **Talking Head** → paspausk, sluoksnis atsiranda.
4. Laukeliu „Import…“ įkelk savo filmuką su veidu.
5. Perjunk visas 7 padėtis ir žiūrėk peržiūroje:
   - apskritimai neliečia kadro krašto ir nelenda po apačios tekstu;
   - `top` / `bottom` užima lygiai pusę;
   - `full` – visą kadrą, be juodų juostų.
6. Uždėk B4 efektą (pvz., `shadow`) – apskritimas turi gauti šešėlį (abu punktai veikia kartu).
7. `npm run studio` – patikrink, kad video groja ir render'yje.

**Žinoma smulkmena:** kalbanti galva yra full-bleed, tad animacija „scaleIn“ (numatyta
vaizdiniams) didina **visą kadrą nuo centro** – kampinis apskritimas atrodys, lyg atskristų iš
vidurio. Jai rinkis IN efektą `fade` arba `none`. Jei tai trukdys – vėliau galima numatytą
efektą full-bleed sluoksniams pakeisti į `fade` (tai būtų atskiras mažas punktas).

### 8 žingsnis. Uždaryti punktą

- `knowledge/shared/analysis-to-tikmaker.json`, `elementKind` → `talking-head`:
  ```json
  "talking-head": {
    "status": "partly",
    "tikmaker": "visual talking-head (own video: full, top/bottom half, circle in a corner)"
  },
  ```
  `partly`, nes video turi įkelti pats kūrėjas (taip pat pažymėti ir `recording`).
- Agento taisyklė „siūlyti tik kai pažymėta „Su veidu““ (`docs/bd/sprendimai.md`) – tai agento
  dalis, ne šito punkto. Dabar tik užtikrinam, kad agentas **turės ką** pasiūlyti.
- `docs/darbu-eile.md`: `- [x] B5`.
- Commitas, pvz.: `B5: kalbančios galvos vaizdinys (visas ekranas, pusė, apskritimas kampuose)`.

---

## Jei kas nors neveikia

| Ką matai | Kur greičiausiai problema |
|---|---|
| Projektas nebeatsidaro / dingo iš sąrašo | Zod schema (`scene.ts` / `visual.ts`) – laukas JSON'e, kurio schema nežino |
| Varnelės yra, bet peržiūroje nieko | 5 žingsnis (B4) – `VisualsLayer` neperduoda `effects` |
| Efektas yra, bet ne ant keliaujančio logotipo | 6 žingsnis (B4) – `visualLinks.ts` / `LinkedVisual.tsx` |
| Didelio logotipo šešėlis milžiniškas | 4d žingsnis (B4) – pamirštas `ownScale` |
| Kalbanti galva mažytė viduryje | 4b žingsnis (B5) – `isFullBleed.ts` |
| Video juodas / „Clip not found“ | failas neįkeltas arba kelias neteisingas – įkelk per „Import…“ |
