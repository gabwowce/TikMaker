# Scenos taisymas su DI – kaip veikia kodas (2026-11-06)

Tikslas: baigtame video pasirenki vieną sceną, parašai, ką pakeisti, ir agentas perdaro
**tik tos scenos vaizdus ir judesį**. Tekstas ir balsas nesikeičia.

## Visas kelias vienu žvilgsniu

```
Skydelis (SceneEditCard)          ← tu parašai komentarą, spaudi „Change scene N“
   │  useEditScene() → tRPC agent.editScene
   ▼
Serveris (server/trpc/agent.ts)
   │  1. step6RequestEdit – patikrina ir ĮRAŠO prašymą į run failą (status "waiting")
   │  2. continueRun – paleidžia agentą fone
   ▼
Agentas (server/agent/agent.ts, case "done")
   │  run.status = "editing_scene"
   │  step6EditScene:
   │     a) editSceneBlocks – DI perrenka tos scenos blokus  (1 kvietimas)
   │     b) checkBlocks – kodas patikrina; jei klaidų – DI taiso dar kartą (0–1 kvietimas)
   │     c) pickMotion – DI perplanuoja judesį, paimama tik ta scena (1 kvietimas)
   │  run.status = "done", taisymas status "done"
   ▼
Skydelis kas sekundę klausia run (polling), pamato „done“
   │  applyAgentSceneEdit → projectFromBlocks(project, run, only = N)
   ▼
Projekte persistato tik scena N → AutoSave įrašo projektą
```

Kvietimų DI: 2–3 vienam taisymui (blokai, gal pataisymas, judesys).

---

## 1. Duomenys – `src/agent/run/6-edit.ts`

Trys schemos: ką siunčia naudotoja, ką atsako DI, kaip taisymas saugomas run faile.

```ts
// Ką siunčia skydelis: kuris paleidimas, kuri scena (nuo 0), ką pakeisti.
export const editSceneFromUser = z.object({
  runId: z.string().min(1),
  sceneIndex: z.number().int().min(0),
  comment: z.string().trim().min(3).max(500),
});

// Ką atsako DI: TA PATI scenos struktūra kaip pilname blokų žingsnyje
// (happens, stage, blocks, keywords) + norų sąrašas.
export const sceneEditFromAi = sceneBlocksFromAi.extend({
  wishes: z.array(z.string().trim().min(3)).max(10),
});

// Vienas taisymas run faile: waiting → working → done (arba error).
export const sceneEditInRun = z.object({
  id: z.string(),
  sceneIndex: z.number().int().min(0),
  comment: z.string(),
  createdAt: z.number(),
  status: z.enum(["waiting", "working", "done", "error"]),
  error: z.string().optional(),
  problems: z.array(blocksProblem).default([]),
});
```

Run faile atsirado laukas `edits` (visų taisymų istorija), o būsenose – `"editing_scene"`
(`src/agent/run/run.ts`, `status.ts`).

**Kodėl taip:** taisymas saugomas run faile kaip ir visi kiti žingsniai – jei serveris
persikrauna ar uždarai redaktorių, matosi, kas buvo paprašyta ir kuo baigėsi.

---

## 2. Kreipinys – `server/trpc/agent.ts`

```ts
editScene: procedure.input(editSceneFromUser).mutation(async ({ input }) => {
  const run = await findRun(input.runId);
  await asBadRequest(() => step6RequestEdit(run, input)); // patikrina + įrašo
  continueRun(await findRun(run.id));                      // agentas – fone
}),
```

Tas pats modelis kaip `approveScript` ar `chooseHook`: atsakymas išsaugomas, tada agentas
tęsia fone, o kreipinys grįžta iš karto (nelaukia DI).

---

## 3. Prašymo įrašymas – `server/agent/steps/6-edit.ts`, `step6RequestEdit`

```ts
if (run.status !== "done" || !run.blocks || !run.script)
  throw new Error(`A scene can be changed once the video is built`);
if (!run.script.scenes[request.sceneIndex])
  throw new Error(`There is no scene ${request.sceneIndex + 1}`);
if (run.edits?.some((edit) => edit.status === "waiting"))
  throw new Error("Another change is already waiting");

const edit: SceneEditInRun = {
  id: `edit-${Date.now().toString(36)}`,
  sceneIndex: request.sceneIndex,
  comment: request.comment,
  createdAt: Date.now(),
  status: "waiting",
  problems: [],
};
await job.save({ edits: [...(run.edits ?? []), edit] });
```

Trys apsaugos: tik baigtas video, tik esama scena, tik vienas taisymas vienu metu.
Klaida čia grįžta į skydelį kaip raudonas tekstas po mygtuku.

---

## 4. Agentas paima taisymą – `server/agent/agent.ts`

```ts
case "done": // the user asked for a change in one scene
  if (!waitingEdit(job.run)) return;
  await job.save({ status: "editing_scene" });
  await step6EditScene(job);
  await job.save({ status: "done" });
  return;
```

Būsenos keičiamos tik `agent.ts` – kaip ir anksčiau. Kol būsena `editing_scene`, skydelis
mato, kad agentas dirba, ir kas sekundę klausia run.

---

## 5. Pats taisymas – `step6EditScene` ir `editScene`

```ts
await setEdit({ status: "working" });
try {
  const problems = await editScene(job, edit);
  await setEdit({ status: "done", problems });
} catch (error) {
  await setEdit({ status: "error", error: message });
}
```

**Svarbu:** klaida pažymi tik taisymą, ne visą paleidimą. Video lieka „done“ ir jį galima
taisyti vėl (kitaip nepavykęs DI kvietimas paslėptų visą video skydelyje).

`editScene` viduje – trys dalys:

**a) DI perrenka sceną ir kodas patikrina** (kaip 4 žingsnyje – vienas pataisymas):

```ts
// visas video su pakeista scena n
const withScene = (scene) => ({
  scenes: blocks.scenes.map((s, i) => (i === n ? picked(scene) : s)),
  wishes: [...new Set([...blocks.wishes, ...scene.wishes])],
});
// tikrinamas VISAS video, bet paimamos tik šios scenos problemos
// ir bendros (pvz. „ta pati išvaizda 3 kartus“)
const check = (plan) =>
  checkBlocks(plan, script, blockLibrary).filter(
    (p) => p.sceneIndex === n || p.sceneIndex === undefined,
  );
let scene = await pick();
let problems = check(withScene(scene));
if (problems.length) {
  scene = await pick({ scene, problems });   // DI mato savo atsakymą + problemas
  problems = check(withScene(scene));
}
await job.save({ blocks: { ...plan, problems: [...kept, ...problems] } });
```

**b) Judesys:** DI perplanuoja judesį visam video (kad skaitytųsi kaip vienas srautas), bet
paimama tik scenos `n` dalis – kitų scenų judesys nesikeičia:

```ts
const planned = await job.ai("pickMotion", () =>
  pickMotion(script.scenes, plan, job.knowledge.motionPrinciples),
);
const scenes = motion.scenes.map((s, i) => (i === n ? planned.scenes[n] : s));
```

---

## 6. Promptas – `server/agent/prompts/pickBlocks.ts`, `editSceneBlocks`

Tas pats katalogas ir tos pačios žinios kaip pilname blokų rinkime (bendra dalis iškelta į
`basePrompt`, kad nesiskirtų), plius:

```ts
const EDIT = `
The video is built; the user wants ONE scene changed. Answer that scene only, picked
again by everything above, so that it does what the user asks. Keep what the user did not
ask to change (the stage, a block that works) unless changing it is what makes the
scene work. The voiceover stays as it is – the blocks go on its words.`;

const user = basePrompt(input, workspace, scenes) + `

The video's pictures now:
${pictures}                       // kiekvienos scenos dabartiniai blokai (JSON)

The user wants scene ${sceneIndex + 1} changed: ${comment}`;
```

DI mato visą video, todėl gali parinkti išvaizdą, kurios kitos scenos dar nenaudoja.

---

## 7. Skydelis – `src/editor/agent/SceneEditCard.tsx` ir `src/api/agent.ts`

Kreipinio kablys:

```ts
export function useEditScene() {
  return useMutation(
    trpc.agent.editScene.mutationOptions({ onSuccess: askForRunAgain }),
  );
}
```

Kuri scena pasirinkta – iš redaktoriaus pasirinkimo. Agento scenų id yra
`scene-<run>-<numeris>`, iš jo gaunamas numeris:

```ts
const prefix = `scene-${run.id}-`;
const sceneIndex = selectedSceneId?.startsWith(prefix)
  ? Number(selectedSceneId.slice(prefix.length)) - 1
  : undefined;   // ne agento scena → „Select one of the agent's scenes“
```

Kada taisymas pritaikomas projektui:

```ts
// Taisymas, kurį skydelis matė „waiting/working“, o dabar „done“ – pritaikomas vieną kartą.
for (const e of run.edits ?? []) {
  if (e.status === "waiting" || e.status === "working") watching.current.add(e.id);
  else if (e.status === "done" && watching.current.has(e.id)) {
    watching.current.delete(e.id);
    applyEdit(run, e.sceneIndex);
  }
}
```

Jei taisymas baigėsi, kai redaktorius buvo uždarytas, jis automatiškai nepritaikomas
(kad netyčia neperrašytų scenos, kurią jau taisei rankomis) – tam yra mygtukas
„apply again“.

---

## 8. Projekto atnaujinimas – `src/agent/projectFromBlocks.ts`

Ta pati funkcija, kuri iš agento blokų stato visą projektą, gavo parametrą `only`:

```ts
export function projectFromBlocks(project, run, only?: number)

// kitos scenos – nepaliestos
if (only !== undefined && n !== only) {
  // tik scena PO taisytos netenka „perkelto“ seno bloko (jis buvo taisytos scenos)
  if (n === only + 1) return { ...scene, content: { ...withoutCarried } };
  return scene;
}
// ir taisyta scena nebeperkelia savo paskutinio bloko į kitą sceną
if (only !== undefined && n === only) return false; // carries(n)
```

Store veiksmas (`projectStore.ts`):

```ts
applyAgentSceneEdit(run, sceneIndex) {
  set({ project: projectFromBlocks(get().project, run, sceneIndex) });
},
```

Po to `AutoSave` kaip visada įrašo projektą į `db/projects/`.

---

## Testai

- `server/__tests__/agent.test.ts` – „changes one scene of a built video“: po taisymo scena 2
  turi naują bloką, scena 1 lygiai tokia pati, judesio scenų tiek pat, žurnale yra
  `editScene`; ir „refuses a scene change before the video is built“.
- `src/agent/__tests__/projectFromBlocks.test.ts` – „rebuilds only the scene the agent
  changed“: rankinis pakeitimas scenoje 1 lieka, scena 2 gauna naują bloką.

## Sprendimai, kuriuos gali keisti

| Kas | Dabar | Kitaip galima |
|---|---|---|
| Ką keičia | tik vaizdus ir judesį | leisti keisti ir žodžius → reikėtų naujo balso tai scenai (ElevenLabs) ir scenos ilgio perskaičiavimo |
| Judesys | perplanuojamas visas video, paimama 1 scena (1 didelis kvietimas) | atskiras mažas kvietimas tik vienai scenai – pigiau, bet DI nematytų srauto |
| Keli taisymai | vienas vienu metu | eilė (kelios scenos iš karto) |
| Pritaikymas | automatiškai, jei skydelis matė; kitaip – mygtukas | visada automatiškai (rizika perrašyti rankinius pakeitimus) |
| Kaimyninės scenos | neliečiamos; dingsta tik „perkeltas“ senas blokas | perstatyti ir kaimynę, kad perkėlimas tarp scenų veiktų iš naujo |
| Atšaukti | nėra (tik redaktoriaus Undo) | saugoti seną scenos versiją ir leisti grįžti |
