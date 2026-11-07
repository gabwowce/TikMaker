# Pokalbis su agentu – kaip veikia kodas (2 etapas, 2026-11-06)

Šis dokumentas paaiškina, kas vyksta nuo to momento, kai paspaudi „Send“, iki pasikeitusio projekto. Kiekvienai daliai nurodytas failas, kodas ir kas jame vyksta. Planas ir sprendimai aprašyti `docs/pokalbis-planas.md`.

---

## 0. Trumpai

**Kada gali rašyti.** Bet kada, kol paleidimas nesustojęs dėl klaidos. Jei agentas tuo metu dirba, žinutė palaukia ir yra paimama, kai tik agentas sustoja ties tavimi:
- kai renkiesi kabliuką;
- kai scenarijus laukia patvirtinimo;
- kai video jau baigtas.

Vienu metu gali būti tik viena neatsakyta žinutė.

**Kas nusprendžia, ką keisti.** Mažas kvietimas `routeMessage` su Sonnet. Jis gauna tavo tekstą, žymes, būseną, kabliuką ir scenų sąrašą. Grąžina tris dalykus:
- atsakymą tau, kurį parašo DI;
- taikinius – ką keisti, kiekvieną su savo nurodymu;
- ar pirma paklausti.

**Ką gali pakeisti:**

| Kada | Taikinys | Kas vyksta |
|---|---|---|
| renkantis kabliuką | `hook` | 3 nauji kabliukai su tavo nurodymu |
| prieš patvirtinimą | `script` | scenarijus perrašomas |
| prieš patvirtinimą | `hook` | nauji kabliukai, o scenarijus išmetamas (vėl renkiesi kabliuką) – **pirma pasiūlo** |
| po pastatymo | `pictures` + scena | tos scenos vaizdai ir jos judesys iš naujo |
| po pastatymo | `motion` + scena | tos scenos judesys iš naujo |
| po pastatymo | `motion` be scenos | viso video judesys iš naujo – **pirma pasiūlo** |
| po pastatymo | `words` + scena | nauji tos scenos žodžiai, naujas balsas, vaizdai iš naujo pagal naujus žodžius |

Jei žinutėje prašoma kelių dalykų, agentas **pirma pasiūlo**. Pakeitimai daromi tik paspaudus „Do it“.

**Kas keičia projektą.** DI grąžina tik savo mažą dalį. Kodas ją patikrina ir įrašo į paleidimo failą. Tada redaktorius iš paleidimo duomenų perstato tik pakeistas scenas (`projectFromBlocks(project, run, scena)`).

---

## 1. Visas kelias

```
REDAKTORIUS                                   SERVERIS
ChatInput: tekstas (+ žymės)
  │ Send → agent.message ───────────────────►  step7Message: įrašo {from:"user", status:"waiting"}
  │ ◄──────────── grįžta iš karto ──────────── continueRun(run)
  │                                              │ jei darbininkas jau dirba → again (paims vėliau)
skydelis kas 1 s klausia run                     ▼
(talking(run) = true)                          work(): runAgent → (kol yra laukiančių darbų) runAgent…
                                                 │ runAgent: būsena awaiting_hook / awaiting_approval / done
                                                 │   → takeUpWork
                                                 │       nextWork → tavo žinutė
                                                 │       step7Route → routeMessage (Sonnet)
                                                 │         ├ nėra taikinių → agento atsakymas-klausimas, pabaiga
                                                 │         ├ reikia patvirtinimo → agento pasiūlymas, pabaiga
                                                 │         └ taikiniai → doTargets
                                                 │       doTargets: būsenos + kiekvienas taikinys
                                                 │       finishWork: žinutė „done“ + „✓ …“ (vienu įrašymu)
ChatMessages pamato „done“ → pritaiko scenas projekte
```

Pasiūlymo atveju kelias tęsiasi toliau: paspaudi „Do it“ → `agent.decide` → pasiūlymas tampa laukiančiu darbu → `takeUpWork` jį paima ir vykdo `doTargets`.

---

## 2. Duomenys – `src/agent/run/7-chat.ts`

```ts
export const chatTargetKind = z.enum(["hook", "script", "pictures", "motion", "words"]);
export const chatTarget = z.object({
  kind: chatTargetKind,
  sceneIndex: z.number().int().min(0).optional(),  // kuri scena
  objectId: z.string().optional(),                 // kuris sluoksnis
  instruction: z.string().optional(),              // ką daryti – žinutė, išskaidyta pagal taikinius
});
export const chatProposal = z.object({
  targets: z.array(chatTarget).min(1),
  decision: z.enum(["yes", "no"]).optional(),      // tik iš mygtukų
});
export const chatMessage = z.object({
  id, at, from: z.enum(["user", "agent"]), text,
  attachments,          // tavo žymės
  targets,              // ką darbas pakeitė (įrašo serveris)
  proposal,             // agento pasiūlymas
  questions,            // 3 etapui
  status,               // tavo žinutė arba priimtas pasiūlymas: waiting → working → done | error
  error,
});
export const routeFromAi = z.object({     // maršrutizatoriaus atsakymas
  reply: z.string().min(1).max(500),
  targets: z.array(chatTarget).max(6),
  confirm: z.boolean(),
});
```

**Kas rašo agento žinutes.** Dabar jas rašo DI: `reply` iš `routeMessage` – jo žodžiais, tavo kalba. Kodas prideda tik:
- „✓“ ir likusių problemų pastabas;
- „OK, I left it as it is.“, kai atsakai „No“;
- „That didn't work: …“, kai nepavyksta.

---

## 3. Redaktorius

### `src/editor/agent/ChatInput.tsx`

```ts
const open = run.status !== "error" && run.status !== "cancelled";
const busy = !open || talking(run) || send.isPending;
```

Laukelis įjungtas visada, išskyrus du atvejus: paleidimas sustojęs arba tavo ankstesnė žinutė dar neatsakyta. Užuomina laukelyje keičiasi pagal etapą („Want different hooks? Say how“ ir pan.). Žymės (pažymėta scena ar sluoksnis) siunčiamos visada, kai jos yra.

### `src/editor/agent/AgentPanel.tsx`

`PanelChat` rodo laukelį, kai tik atidarytas projektas turi paleidimą.

### `src/api/agent.ts`

```ts
export function talking(run) {   // tavo žinutė arba priimtas pasiūlymas laukia ar dirbamas
  return run.messages.some(m => m.status === "waiting" || m.status === "working");
}
export function useSendMessage() { … trpc.agent.message … }
export function useDecide()      { … trpc.agent.decide … }   // „Do it“ / „No“
```

Kol `talking(run)`, skydelis klausia kas sekundę, net jei paleidimas „done“.

### `src/editor/agent/ChatMessages.tsx`

- **Tavo žinutė:** žymės, tekstas, būsena („Waiting for the agent…“, „The agent is on it…“, klaida, „apply scene N again“).
- **Agento žinutė:** tekstas. Jei tai pasiūlymas, rodomas sąrašas, ką keis (pvz. „Motion · whole video – slower“), ir mygtukai **Do it / No**. Paspaudus rodoma „✓ Accepted“ arba „Declined“, o vėliau – darbo būsena.
- **Pritaikymas projektui** (`applyTargets`):

```ts
if (targets.some(t => t.kind === "words")) await loadCustomSfx();   // naujas balso klipas – redaktorius turi jį žinoti
if (targets.some(t => t.kind === "motion" && t.sceneIndex === undefined))
  return applyAll(run);                                           // viso video judesys – visos scenos
for (const scene of changedScenes(targets)) applyScene(run, scene); // kitaip – tik pakeistos scenos
```

Kabliukas ir scenarijus projekto nekeičia: kol scenarijus nepatvirtintas, projektas dar tuščias. Kaip ir 1 etape, automatiškai pritaikoma tik tai, ką skydelis matė dirbant. Visa kita pritaikoma mygtuku „apply … again“.

### `src/agent/projectFromBlocks.ts`

Perstatant vieną sceną, žodžiai imami iš scenarijaus, nes po `words` taikinio projekte dar seni:

```ts
const vo = (only === n ? run.script?.scenes[n]?.voiceover : undefined) ?? scene.vo ?? "";
...
return { ...scene, vo: plan.vo, stage: plan.stage, ... };
```

---

## 4. Serveris

### 4.1 Kreipiniai – `server/trpc/agent.ts`

```ts
message: procedure.input(sendMessageFromUser).mutation(async ({ input }) => {
  const run = await findRun(input.runId);
  await asBadRequest(() => step7Message(run, input));   // įrašo
  continueRun(await findRun(run.id));                   // agentas – fone
}),
decide: procedure.input(decideFromUser).mutation(async ({ input }) => {
  const run = await findRun(input.runId);
  await asBadRequest(() => step7Decide(run, input));    // įrašo sprendimą
  continueRun(await findRun(run.id));
}),
```

### 4.2 Vienas darbininkas – `server/agent/agent.ts`

```ts
const working = new Set<string>();   // kurie paleidimai dabar dirbami
const again = new Set<string>();     // kam atėjo kas nors nauja, kol dirbo

export function continueRun(run) {
  if (working.has(run.id)) { again.add(run.id); return; }   // antro darbininko nepaleidžiam
  working.add(run.id);
  void work(run).catch(...klaida → status "error"...).finally(() => working.delete(run.id));
}

async function work(first) {
  let run = first;
  for (;;) {
    again.delete(run.id);
    await runAgent(run);
    const latest = await getRun(run.id);
    const pending = nextWork(latest) !== undefined && TALK_STATUSES.includes(latest.status);
    if (!pending && !again.has(run.id)) return;   // nieko nebeliko
    run = latest;                                 // dar yra – dar ratas
  }
}
```

Kodėl to reikia. Kai žinutė ateina agentui dirbant, jos `continueRun` antro darbininko nepaleidžia. Esamas darbininkas, baigęs žingsnį, pamato laukiančią žinutę ir ją paima. Taip žinutė nebus apdorota du kartus ir neliks pamiršta.

`runAgent` būsenose `awaiting_hook`, `awaiting_approval` (kol nepatvirtinta) ir `done` kviečia `takeUpWork`:

```ts
async function takeUpWork(job) {
  const item = nextWork(job.run);              // tavo žinutė arba priimtas pasiūlymas
  if (!item) return;
  if (item.from === "user") {
    const routed = await step7Route(job, item);
    if (!routed) return;                       // agentas paklausė arba pasiūlė
    return doTargets(job, item, routed.targets, routed.reply);
  }
  … pasiūlymas: status "working" …
  return doTargets(job, item, item.proposal.targets, item.text);
}
```

`doTargets` – darbas su būsenomis, kurias mato skydelis:

```ts
const hook = targets.find(t => t.kind === "hook");
if (hook) {                                     // kabliukas – vienas, nes grąžina prie kabliuko rinkimo
  await job.save({ status: "writing_hooks" });
  await step7Hooks(job, hook.instruction);
  await job.save({ status: "awaiting_hook" });
} else {
  if (from === "done") await job.save({ status: "answering" });
  for (const target of targets) {
    if (target.kind === "script") { await step7ToScript(job, …); await toScript(job); }
    else notes.push(...(await step7Change(job, target)));   // pictures / motion / words
  }
  if (from === "done") await job.save({ status: "done" });
}
await finishWork(job, item.id, targets, reply, notes);
// klaida → būsena grąžinama į buvusią, žinutė „error“, agentas pasako priežastį
```

### 4.3 Įrašymas be lenktynių – `server/agent/runs.ts`, `job.ts`

Kai rašo du (agentas dirba, o tuo metu ateina tavo žinutė), abu perskaito seną failą, ir vėlesnis įrašymas panaikintų ankstesnio pakeitimą. Ši klaida rasta testuose: žinutė dingdavo. Sprendimas turi dvi dalis:

```ts
// runs.ts – po vieną pakeitimą kiekvienam paleidimui: perskaityti → pakeisti → įrašyti
export function updateRun(id, change: (latest) => AgentRun): Promise<AgentRun> { …eilė… }

// job.ts – kiekvienas agento įrašymas sujungia žinutes su esančiomis faile
job.run = await updateRun(job.run.id, (onDisk) => ({
  ...job.run, ...changes,
  messages: mergeMessages(changes.messages ?? job.run.messages, onDisk?.messages),
}));
```

`mergeMessages` veikia taip:
- žinutė, kuri yra tik faile (tavo nauja), išlieka;
- žinutė, kuri yra abiejose vietose – laimi agento versija;
- išimtis: jei faile pasiūlymas jau atsakytas mygtuku, imamas failo sprendimas.

### 4.4 Žinutės žingsniai – `server/agent/steps/7-chat.ts`

```ts
const ALLOWED = {
  awaiting_hook: ["hook"],
  awaiting_approval: ["script", "hook"],
  done: ["pictures", "motion", "words"],
};
```

- **`step7Message`** – įrašo žinutę. Atmeta, jei paleidimas sustojęs arba dar laukia ankstesnis darbas.
- **`nextWork`** – randa seniausią laukiantį darbą: tavo žinutę arba priimtą pasiūlymą.
- **`step7Decide`** – įrašo mygtuko sprendimą. „Taip“ paverčia pasiūlymą laukiančiu darbu. „Ne“ → agentas atsako „OK, I left it as it is.“.
- **`step7Route`** – kviečia `routeMessage` ir patikrina atsakymą kodu (`validTargets`):
  - lieka tik tai, ką leidžia `ALLOWED`;
  - `pictures` ir `words` būtinai turi sceną. Jei DI scenos nenurodė, o pažymėta lygiai viena, imama ji;
  - scena turi egzistuoti;
  - sluoksnis pridedamas tik prie savo scenos vaizdų.

  Po patikros:
  - taikinių nėra → agento atsakymas (klausimas arba paaiškinimas);
  - `confirm` arba `reachesFar` (keli taikiniai, viso video judesys, kabliukas kai jau yra scenarijus) → pasiūlymas. Kodas laikosi sprendimo 3, net jei DI paklausti „pamiršo“.
- **`step7Hooks`** – `writeHooks` su tavo nurodymu ir ankstesniais kabliukais. Pasirinktas kabliukas ir scenarijus išmetami.
- **`step7ToScript`** – nurodymas tampa scenarijaus komentaru, o `toScript` scenarijų perrašo.
- **`step7Change`:**
  - `pictures` → `changeScenePictures` (`6-edit.ts`);
  - `motion` → `pickMotion` su prašymu; vienai scenai paimama tik jos dalis, visam video – viskas;
  - `words` → `rewriteScene` (naujas tekstas) → `generateVoice` (naujas balsas, jei video turi balsą) → `changeScenePictures` pagal naujus žodžius.
- **`finishWork` / `failWork`** – žinutės būsena ir agento atsakymas įrašomi vienu įrašymu, kad skydelis niekada nematytų vieno be kito.

### 4.5 Promptai

- **`server/agent/prompts/routeMessage.ts` (naujas, Sonnet)** gauna:
  - kur yra video ir kas leidžiama dabar (su paaiškinimu, ką daro kiekvienas taikinys);
  - kabliuką;
  - scenas – balsą ir trumpai vaizdus;
  - žymes ir tavo žinutę.

  Taisyklės:
  - kelis prašymus skaidyti į kelis taikinius;
  - „this/here“ reiškia tai, kas pažymėta;
  - `confirm` nustatyti, kai pakeitimas paliečia kelias dalis;
  - neaišku arba negalima → taikinių neduoti ir paklausti arba paaiškinti, tavo kalba.
- **`server/agent/prompts/rewriteScene.ts` (naujas)** – vienos scenos `voiceover` ir `onScreen`. DI mato kaimynines scenas, kad tekstas jungtųsi su jomis, ir negali išgalvoti faktų.
- **`writeHooks.ts`** – naujas neprivalomas parametras `change`: ankstesni kabliukai ir ką nori kitaip.
- **`pickMotion.ts`** – naujas neprivalomas parametras `request`: ką nori pakeisti judesyje.
- **`llm.ts`, `claudeCode.ts`** – vienam kvietimui galima nurodyti modelį (`claude: { model: "sonnet" }`).

---

## 5. Testai (`server/__tests__/agent.test.ts`)

Netikras modelis atsako ir į maršrutizatorių (`fakeRoute`, pagal žinutės tekstą), ir į scenos perrašymą. Testai:
- pažymėtos scenos vaizdai pakeičiami; scenos nenurodė DI, todėl kodas paėmė pažymėtą;
- neaiški žinutė → agentas klausia;
- scenos žodžiai perrašomi, o kitos scenos nepasikeičia; žurnale yra `rewriteScene` ir `editScene`;
- viso video judesys → pasiūlymas, kol nepaspausta niekas nesikeičia, o po „Do it“ judesys perplanuojamas;
- „No“ → niekas nesikeičia;
- kabliukų perrašymas, kol renkiesi kabliuką;
- žinutė, išsiųsta agentui dirbant, paimama, kai jis sustoja (šis testas ir parodė lenktynių klaidą);
- scenarijus perrašomas žinute (FR-10).

## 6. Ribos

- Vienu metu galima tik viena neatsakyta žinutė.
- Po pastatymo pakeisti kabliuką ar visą scenarijų negalima, nes reikėtų iš naujo kurti visą video. Agentas tai paaiškina ir pasiūlo keisti scenų žodžius.
- Darbininkų sąrašas laikomas serverio atmintyje. Jei serveris persikrauna darbo viduryje, laukianti žinutė lieka faile. Kitas kreipinys (pvz., bandymas siųsti naują žinutę) pažadina darbininką, ir jis ją paima. Nauja žinutė tuo metu atmetama, nes viena dar laukia.
