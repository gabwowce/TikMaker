# Kaip skaityti redaktoriaus kodą

Pradėti nuo `src/main.tsx`, tada skaityti `Editor.tsx`. Paleidimo funkcija
įkelia išsaugotus duomenis ir paleidžia React. `Editor` sudeda ekrano dalis.

## Ekrano dalys

- `EditorToolbar.tsx`: projekto pasirinkimas, meniu, režimai ir išsaugojimas.
- `VideoPreview.tsx`: Remotion peržiūra, mastelis ir saugios zonos.
- `EditorInspector.tsx`: scenos arba pasirinkto objekto nustatymai.
- `panels/LibraryPanel.tsx`: teksto, vaizdų, garso, scenų ir fonų skirtukai.
- `storyboard/ProjectStoryboardView.tsx`: scenų plano ekranas.
- `storyboard/StoryboardSceneList.tsx`: scenų sąrašas ir pasirinkimas.
- `storyboard/StoryboardSceneForm.tsx`: pasirinktos scenos plano laukai.

`usePreviewPlayer.ts` valdo peržiūros kadrą, `usePreviewSize.ts` skaičiuoja
peržiūros dydį, o `useEditorShortcuts.ts` aprašo klaviatūros veiksmus.

## Duomenys

`state/projectStore.ts` saugo dabartinį projektą, pasirinkimą ir redagavimo
veiksmus. `projectStoreTypes.ts` aprašo tipus. `projectLibrary.ts` įkelia ir
saugo projektų biblioteką. `fileLibrary.ts` siunčia užklausas į serverį.

Duomenų kelias: lauko pakeitimas → Zustand veiksmas → projekto pakeitimas →
komponentas parodo naują reikšmę. Formoje nelaikome antros scenos kopijos.
Store taip pat valdo atšaukimą ir automatinį saugojimą.

## Nustatymai ir laiko juosta

`panels/InspectorPanel.tsx` pasirenka sceną ir parodo nustatymų skirtuką.
Skirtukų turinys yra `inspector/`:

- `SceneContentSettings.tsx`: tekstas, palyginimo stulpeliai, žingsniai ir balsas.
- `SceneLayerSettings.tsx`: vaizdų sluoksnių sąrašas ir tvarka.
- `SceneMotionSettings.tsx`: trukmė, animacija ir scenos perėjimas.

Šiame aplanke taip pat yra vaizdo laukai, garso pasirinkimas ir balso generavimas.

`VisualFieldsEditor.tsx` pagal vaizdo tipą pasirenka formą: `RecordingFields`,
`DeviceFields`, `DataFields`, `ListVisualFields` arba `DiagramFields`.
`MediaInputs.tsx` turi failo ir paveikslėlio pasirinkimo laukus.

Pasirinkto laiko juostos objekto nustatymus sudeda `TimelineObjectPanel.tsx`.
`ObjectControls.tsx` turi bendrus laukus, `ObjectTextSettings.tsx` – teksto
nustatymus, `ObjectEffects.tsx` – efektus, `ObjectKeyframes.tsx` – animacijos
taškų nustatymus.

Store veiksmai naudoja tris pagrindines funkcijas: `updateScene` keičia
scenos laukus, `updateSceneContent` – turinio laukus, `updateSceneMotion` –
judėjimo laukus. Pavyzdžiui, `updateSceneEntrance` kviečia `updateSceneMotion`.
Vienas toks kvietimas sukuria vieną atšaukimo žingsnį. Store objektų metodai
rašomi `updateSceneEntrance(id, entrance) { ... }`.

`timeline/SceneTimeline.tsx` rodo vieną sceną, `FullVideoTimeline.tsx` – visą
projektą. `buildSceneTimelineRows.ts` ir `buildFullTimelineRows.ts` paruošia
juostų duomenis. Klipų atvaizdavimas, animacijos langas ir išdėstymo
skaičiavimai turi atskirus failus.

`state/linkScenes.ts` aprašo vaizdo perkėlimą į kitą sceną: paruošia susietus
vaizdus ir grąžina naują projektą. Pradiniai duomenys nekeičiami. Store
išsaugo rezultatą vienu veiksmu, todėl susiejimą galima atšaukti.

`timeline/groupDrag.ts` skaičiuoja pažymėtų klipų pozicijas abiem laiko
juostos režimams. Scenos režime riboja judėjimą scenos trukme, viso video
režime vaizdų laiką perskaičiuoja pagal scenos pradžią. Garso klipų laikas
lieka bendras visam video. `snapFrame` iš `sceneTimelineLayout.ts` pritraukia
klipą prie artimo kadro pagal ekrano mastelį.

`sceneTimelineEnd.ts` vienoje vietoje nustato redaguojamą laiko intervalą.
Jį naudoja ir laiko juosta, ir objekto nustatymų forma, todėl jų ribos sutampa.
Efektai pasirenkami įprastais Mantine `NativeSelect` laukais.

Laiko juostai palikti esami komponentai. Izoliuotame bandyme
`@xzdarcy/react-timeline-editor` 1.0.0 nepalaikė kelių klipų judinimo kartu
ir perkėlimo tarp eilučių. Šių funkcijų išsaugojimui reikėtų papildomos
logikos, todėl ši biblioteka į projektą neįtraukta. Animacijos reikšmes
interpoliuoja jau naudojama Remotion biblioteka.

## Bibliotekos ir stiliai

- **React**: komponentai ir vietinė ekrano būsena.
- **Mantine**: paruošti mygtukai, laukai, skirtukai ir dialogai.
- **Tailwind**: statiniai stiliai redaktoriuje ir video komponentuose.
- **Zustand**: bendri projekto duomenys ir jų keitimo veiksmai.
- **Zod**: importuojamų duomenų patikra.
- **Remotion**: video atvaizdavimas ir generavimas.

`mantineTheme.ts` nustato valdiklių išvaizdą, `styles.css` prijungia naudojamų
Mantine komponentų stilius ir Tailwind. `theme.ts` aprašo redaktoriaus spalvas,
o `GlobalStyles.tsx` pateikia jas kaip CSS kintamuosius.

Globalūs Mantine ir Tailwind stilių atstatymai neprijungti, nes paveiktų ir
video elementus. Klasė `editor-ui` skirta redaktoriaus valdikliams.
Nustatymų formos naudoja Mantine valdiklius ir Tailwind klases. `style`
paliekamas reikšmėms iš projekto duomenų ir skaičiavimų: video animacijai,
pasirinktoms spalvoms, klipų pozicijoms bei peržiūros masteliui.

`src/styles.css` prijungia bendrą Tailwind. `postcss.config.cjs` aprašo jo
apdorojimą, o `remotion.config.ts` įjungia tą patį apdorojimą video eksportui.
Naudojama oficiali [Remotion Tailwind integracija](https://www.remotion.dev/docs/tailwind-v4/overview).

## Rašymo taisyklės

- Komponentus ir vardines funkcijas rašome `export function Editor() { ... }`.
- React funkcijas importuojame tiesiogiai: `import { useEffect } from "react"`.
- Trumpus `onClick`, `map` ir hook callback'us paliekame rodyklinėmis funkcijomis.
- Mantine komponentus importuojame tiesiai, nekuriame savo `Button` apvalkalų.
- Funkcijas vadiname pagal jų atliekamą veiksmą.
- Komentarų paprastam kodui nerašome. Būtinas paaiškinimas gali būti lietuviškas.

Patikros: `npm run typecheck`, `npm test` ir `npm run build`.
Windows PowerShell aplinkoje prireikus naudoti `npm.cmd`.
