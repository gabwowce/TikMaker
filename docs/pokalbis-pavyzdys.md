# Viena žinutė per visą kodą – pavyzdys (2026-11-06)

Šis dokumentas seka vieną žinutę nuo „Send“ iki pasikeitusio projekto. Duomenys tikri: 10 testas (`run-mw4nasvv`, projektas „10 testas“), 3 scena. Promptai sugeneruoti tuo pačiu kodu, kurį naudoja agentas.

**Situacija.** Video jau baigtas (būsena `done`). Scenų juostoje pažymi 3 sceną ir parašai:

> Make this scene's words simpler and shorter

3 scena dabar:

```json
// paleidime (db/agent-runs/run-mw4nasvv.json) → script.scenes[2]
{ "role": "demo",
  "voiceover": "First, I type one line into TikMaker. That's the whole instruction.",
  "onScreen": "Step 1: one-line idea",
  "visual": "Screen recording: the cursor clicks the TikMaker idea box, ...",
  "needsRecording": true }

// paleidime → blocks.scenes[2]
{ "happens": "The cursor clicks the TikMaker idea box, types one sentence and clicks start.",
  "stage": "top",
  "blocks": [{ "onWord": "First", "kind": "screen", "text": "Type one line, click start",
               "record": "In TikMaker, start on the empty new-video page. ...", "seconds": 5 }],
  "keywords": ["one line", "whole instruction"] }

// projekte (db/projects/project-1793949582528.json) → scenes[2]
{ "id": "scene-run-mw4nasvv-3",
  "vo": "First, I type one line into TikMaker. That's the whole instruction.",
  "stage": "top", "durationSeconds": 3.787,
  "content": { "visuals": [{ "id": "scene-run-mw4nasvv-3-block-1",
      "visual": { "type": "stage-block", "block": { …tas pats blokas… } },
      "x": 50, "y": 34.11, "scale": 1, "delay": 0, "exitAt": 114, "entrance": "scaleIn", … }] } }

// projekte → audioClips (3 scenos balsas)
{ "id": "audio-run-mw4nasvv-scene-run-mw4nasvv-3", "sfxId": "vo-run-mw4nasvv-scene-3-mw4no0ui",
  "from": 388, "durationInFrames": 114,
  "words": [{ "text": "First,", "start": 0, "end": 0.383 }, { "text": "I", "start": 0.43, … }, …] }
```

Iš to matyti, kad yra **du failai**:
- **paleidimas** (`db/agent-runs/…json`) – ką nusprendė agentas;
- **projektas** (`db/projects/…json`) – ką rodo redaktorius ir kas renderinama.

DI rašo tik į paleidimą. Projektą iš paleidimo stato kodas.

---

## 1 žingsnis. Redaktorius: žymė ir siuntimas

**`src/editor/agent/ChatInput.tsx` → `useSelectedAttachments`**

Pažymėtos scenos id yra `scene-run-mw4nasvv-3`. Kodas patikrina, ar ji šio paleidimo:

```ts
const prefix = `scene-${run.id}-`;                      // "scene-run-mw4nasvv-"
if (!id?.startsWith(prefix)) return [];                 // kita scena – žymės nėra
const sceneIndex = Number(id.slice(prefix.length)) - 1; // "3" → 2 (skaičiuojama nuo 0)
out = [{ sceneIndex: 2, label: "Scene 3" }];
```

Virš laukelio atsiranda žymė „📎 Scene 3“. Paspaudus **Send**:

```ts
send.mutate({ runId: "run-mw4nasvv",
              text: "Make this scene's words simpler and shorter",
              attachments: [{ sceneIndex: 2, label: "Scene 3" }] });
```

`useSendMessage` (`src/api/agent.ts`) siunčia tai serveriui per tRPC kaip HTTP užklausą `POST /trpc/agent.message`, su šiais trimis laukais JSON pavidalu. Vite ją perduoda API serveriui (`:3001`).

---

## 2 žingsnis. Serveris: žinutė įrašoma, agentas pažadinamas

**`server/trpc/agent.ts` → `message`**

```ts
message: procedure.input(sendMessageFromUser)   // ① Zod patikrina formą: tekstas 2–1000 simb., žymės
  .mutation(async ({ input }) => {
    const run = await findRun(input.runId);     // ② perskaito paleidimo failą
    try {
      await asBadRequest(() => step7Message(run, input));   // ③ įrašo žinutę
    } finally {
      continueRun(await findRun(run.id));       // ④ pažadina agentą (fone)
    }
  }),
```

**`server/agent/steps/7-chat.ts` → `step7Message`**

```ts
if (run.status === "error" || run.status === "cancelled") throw …;   // sustojęs paleidimas
if (nextWork(run)) throw new Error("The agent is still working on your last message");
const message = { id: newId("msg"), at: Date.now(), from: "user",
                  text: input.text, attachments: input.attachments, status: "waiting" };
await job.save({ messages: [...(run.messages ?? []), message] });
```

Paleidimo faile atsiranda:

```json
"messages": [
  { "id": "msg-mw5…", "at": 1793…, "from": "user",
    "text": "Make this scene's words simpler and shorter",
    "attachments": [{ "sceneIndex": 2, "label": "Scene 3" }],
    "status": "waiting" }
]
```

`job.save` eina per `updateRun` (`runs.ts`). Šis pakeitimai tam pačiam paleidimui vykdomi po vieną: perskaityti → pakeisti → įrašyti. Todėl žinutė neprapuls, net jei agentas tuo metu ką nors įrašinėja.

④ `continueRun` paleidžia darbą **fone** (`void work(run)`) ir iš karto grįžta. Naršyklė gauna atsakymą „ok“ per kelias milisekundes, DI nelaukia.

---

## 3 žingsnis. Agentas paima žinutę

**`server/agent/agent.ts`**

```ts
continueRun(run)           // niekas nedirba šio paleidimo → working.add, work(run)
  work(run)                // ratas: runAgent, tada „ar dar yra darbo?“
    runAgent(run)          // run.status === "done" →
      takeUpWork(job)
        nextWork(job.run)  // seniausia „waiting“ žinutė → mūsų žinutė
        step7Route(job, item)
```

---

## 4 žingsnis. Pirmas DI kvietimas: ką keisti (Sonnet)

**`server/agent/steps/7-chat.ts` → `step7Route`** kviečia:

```ts
const routed = await job.ai("routeMessage", () =>
  routeMessage(message, { status: "done", allowed: ["pictures", "motion", "words"],
                          hook: job.run.hook?.text, scenes, blocks: job.run.blocks }));
```

`job.ai(...)` – kiekvienas DI kvietimas įrašomas į paleidimo `steps[]`: pavadinimas, promptas, atsakymas, laikas, žetonai. Tai ir yra „▸ … tokens“ eilutės skydelyje.

**`server/agent/prompts/routeMessage.ts`** sudaro promptą. Sistemos dalis (`SYSTEM`) paaiškina DI užduotį: perskaityti žinutę, suskaidyti į taikinius, nuspręsti `confirm`, atsakyti tavo kalba. Vartotojo dalis su tikrais 10 testo duomenimis:

```
Where the video is: done
Allowed now:
- pictures: pick one scene's pictures (blocks) again – needs sceneIndex; the words stay
- motion: plan the motion again – one scene (sceneIndex) or, without sceneIndex, the whole video
- words: write one scene's voiceover again – needs sceneIndex; then its voice and its pictures are made again on the new words

Hook: This whole video was made by an AI agent from one sentence.
Scene 1 (hook): This whole video was made by an AI agent from one sentence. Let me show you how. | pictures: full – screen
Scene 2 (mechanism): A chatbot answers. An agent does. … | pictures: split – chat, schema
Scene 3 (demo): First, I type one line into TikMaker. That's the whole instruction. | pictures: top – screen
…
Scene 8 (cta): Comment a topic, and the agent will turn it into my next video. … | pictures: split – chat, transform

Attached (selected in the editor):
- Scene 3

Message: Make this scene's words simpler and shorter
```

**Kaip jis išsiunčiamas.** `callStructured(routeFromAi, {system, user}, undefined, { model: "sonnet" })` (`server/agent/ai/llm.ts`). Kadangi `AGENT_PROVIDER=claude-code`, kviečiama `callClaudeCode` (`server/agent/ai/claudeCode.ts`). Ji paleidžia Claude Code be lango:

```
claude -p --output-format json
       --json-schema '{…routeFromAi schema…}'   ← atsakymo forma, Claude privalo jos laikytis
       --tools ""                                ← jokių įrankių
       --model sonnet
       --system-prompt "<SYSTEM>"
       --no-session-persistence
(stdin) ← vartotojo prompto tekstas
```

Kiekvienas kvietimas yra nauja sesija be atminties, todėl promptas turi visą kontekstą.

**Ką Sonnet atsako** (pavyzdys, pagal schemą `routeFromAi`):

```json
{ "reply": "I'll make scene 3's words simpler and shorter, then redo its voice and pictures.",
  "targets": [{ "kind": "words", "sceneIndex": 2, "instruction": "simpler and shorter" }],
  "confirm": false }
```

`readAnswer` (`claudeCode.ts`) patikrina atsakymą pagal Zod schemą. Jei forma neteisinga, Claude klausiamas iš naujo (iki 3 kartų).

**Kodo patikra – `validTargets`:**
- `words` leidžiamas būsenoje `done` ✓;
- `words` turi sceną 2 ✓ (jei DI būtų jos nenurodęs, kodas paimtų pažymėtą sceną);
- scena 2 egzistuoja (iš 8) ✓.

**`reachesFar`:** taikinys vienas, tai ne viso video judesys ir ne kabliukas, todėl klausti nereikia. Jei būtų reikėję, čia agentas būtų įrašęs pasiūlymą su mygtukais ir sustojęs.

Žinutė paleidime pasikeičia:

```json
{ …, "status": "working",
  "targets": [{ "kind": "words", "sceneIndex": 2, "instruction": "simpler and shorter" }] }
```

---

## 5 žingsnis. Darbas: `doTargets` → `step7Words`

**`server/agent/agent.ts` → `doTargets`**

```ts
await job.save({ status: "answering" });          // skydelis rodo, kad agentas dirba
notes.push(...(await step7Change(job, target)));  // target.kind === "words" → step7Words
await job.save({ status: "done" });
await finishWork(job, item.id, targets, reply, notes);
```

**`server/agent/steps/7-chat.ts` → `step7Words`** daro tris dalykus iš eilės.

### 5a. Antras DI kvietimas: nauji žodžiai (`rewriteScene`, Opus)

Promptas (`server/agent/prompts/rewriteScene.ts`) gauna kanalą, tikrus TikMaker ekranus, idėją ir visas scenas. Rodyklė pažymi tą, kurią reikia perrašyti:

```
  Scene 2 (mechanism): A chatbot answers. An agent does. …
→ Scene 3 (demo): First, I type one line into TikMaker. That's the whole instruction.
  Scene 4 (demo): Second, the agent picks a hook, writes the script and splits it into scenes, …

Rewrite scene 3: simpler and shorter
```

Atsakymas (schema `sceneWordsFromAi`):

```json
{ "voiceover": "First, I type one line into TikMaker. That's it.", "onScreen": "One line" }
```

Kodas įrašo jį į paleidimą: `script.scenes[2].voiceover` ir `onScreen` pakeičiami, kitos scenos nepaliečiamos.

### 5b. Naujas balsas (ElevenLabs, ne DI)

```ts
const clip = await generateVoice(words.voiceover, "run-mw4nasvv scene 3");
await job.save({ voice: { scenes: voice.scenes.map((s, i) => i === 2 ? { sfxId: clip.id, words: clip.words } : s) } });
```

`generateVoice` (`server/voice.ts`) nusiunčia tekstą ElevenLabs. Grįžta garso failas (įrašomas į `public/assets/…` ir užregistruojamas garsų sąraše) ir kiekvieno žodžio laikas. Paleidime `voice.scenes[2]` dabar rodo naują klipą ir naujus žodžių laikus.

### 5c. Trečias DI kvietimas: vaizdai pagal naujus žodžius (`changeScenePictures`, Opus)

**`server/agent/steps/6-edit.ts` → `changeScenePictures(job, 2, "The words of this scene were just rewritten – pick its pictures for the new words. simpler and shorter")`**

Promptas (`editSceneBlocks`, `pickBlocks.ts`) yra tas pats kaip renkant blokus visam video:
- vaizdų principai, kanalas, ekranai, idėja, stage tipai, katalogas, logotipai ir objektai;
- visos scenos, jau su **nauju** 3 scenos tekstu;
- dabartiniai visų scenų blokai;
- ir gale: `The user wants scene 3 changed: The words of this scene were just rewritten – …`.

DI grąžina vienos scenos blokus (`happens`, `stage`, `blocks`, `keywords`, `wishes`). Toliau:
1. `checkBlocks` patikrina **visą** video su nauja 3 scena. Pavyzdžiui, ar bloko žodis „First“ tikrai yra naujame tekste.
2. Jei yra tikrų problemų, DI jas taiso vieną kartą.
3. Paleidime `blocks.scenes[2]` pakeičiama.
4. `pickMotion` (dar vienas DI kvietimas) perplanuoja judesį, o paimama tik `motion.scenes[2]`.

Iš viso šiai žinutei: **4 DI kvietimai** (Sonnet maršrutas, žodžiai, vaizdai, judesys; jei patikra randa problemų – dar vienas vaizdams) ir 1 ElevenLabs kvietimas. Visi jie matosi `steps[]`.

### 5d. Pabaiga

**`finishWork`** – vienu įrašymu:

```json
// tavo žinutė
{ …, "status": "done", "targets": [{ "kind": "words", "sceneIndex": 2, … }] }
// nauja agento žinutė
{ "id": "msg-…", "from": "agent",
  "text": "✓ I'll make scene 3's words simpler and shorter, then redo its voice and pictures." }
```

Jei kas nors nepavyktų (pvz., ElevenLabs klaida), `failWork` pažymėtų žinutę `error`, agentas parašytų „That didn't work: …“, o būsena grįžtų į `done`.

Tada `work()` patikrina, ar dar yra laukiančių darbų. Jų nėra, todėl darbininkas baigia.

---

## 6 žingsnis. Redaktorius pastebi ir pakeičia projektą

**`src/api/agent.ts` → `useAgentRun`.** Kol `talking(run)` (yra „waiting“ arba „working“ žinutė), skydelis kas sekundę klausia `agent.get`. Taip jis mato visus tarpinius pakeitimus: „Waiting…“ → „The agent is on it…“ → „done“.

**`src/editor/agent/ChatMessages.tsx`:**

```ts
// kiekvieną kartą, kai ateina nauja run versija:
if (message.status === "working") watching.current.add(message.id);      // matėme dirbant
else if (message.status === "done" && watching.current.has(message.id)) {
  watching.current.delete(message.id);
  void applyTargets(run, message.targets);                               // pritaikyti vieną kartą
}

async function applyTargets(run, targets) {
  if (targets.some(t => t.kind === "words")) await loadCustomSfx();      // ① naujas balsas – į garsų sąrašą
  for (const scene of changedScenes(targets)) applyScene(run, scene);   // ② scena 2
}
```

① Be `loadCustomSfx` peržiūra nerastų naujo garso failo.

② `applyAgentSceneEdit(run, 2)` (`projectStore.ts`) → `projectFromBlocks(project, run, 2)` (`src/agent/projectFromBlocks.ts`):
- **Kitos scenos** grąžinamos tokios, kokios yra projekte, su visais rankiniais pakeitimais. Tik 4 scena netenka „perkelto“ seno 3 scenos bloko, jei toks buvo.
- **3 scena perstatoma iš paleidimo duomenų:**

  ```ts
  const vo = run.script.scenes[2].voiceover;   // NAUJAS tekstas (projekte dar senas)
  const end = voicedSceneSeconds(voice) * fps; // NAUJO balso trukmė + 0,35 s
  const frameOf = (žodis) => naujo balso žodžio laikas * 30;
  const slots = blockTimeline(vo, blokų žodžiai, vietų sk., end, frameOf); // kada kiekvienas blokas
  ```

  Kiekvienas naujas blokas tampa sluoksniu su apskaičiuotais `y`/`scale` (pagal stage), `delay` (jo žodžio kadras naujame balse), `exitAt`, įėjimu ir išėjimu iš `motion.scenes[2]`.
- **`withAgentVoice`** (`src/agent/agentVoice.ts`):
  - kiekviena agento scena gauna trukmę pagal savo balsą, todėl 3 scena sutrumpėja;
  - balso klipai sudedami iš naujo: 3 scenos klipas gauna naują `sfxId` ir žodžius;
  - **visi vėlesni klipai pasislenka anksčiau** (`from` mažesnis), nes 3 scena trumpesnė;
  - scenų pradžios skaičiuojamos vienoje vietoje (`computeSceneTimings`), todėl subtitrai seka paskui.

Projekte 3 scena dabar atrodo taip:

```json
{ "id": "scene-run-mw4nasvv-3",
  "vo": "First, I type one line into TikMaker. That's it.",     ← naujas
  "durationSeconds": <naujo balso trukmė>,                      ← trumpesnė
  "content": { "visuals": [ …nauji sluoksniai, delay pagal naujo balso žodžius… ] } }
```

Tada:
- `set({ project })` – peržiūra iš karto rodo naują sceną;
- `AutoSave` (`src/editor/AutoSave.tsx`) po 400 ms išsaugo projektą į `db/projects/project-1793949582528.json` (`projects.save`);
- redaktoriaus **Undo** grąžina viską atgal, nes pakeitimas įrašytas į istoriją kaip vienas žingsnis.

Jei skydelis tuo metu būtų buvęs uždarytas, automatinio pritaikymo nebūtų. Prie žinutės būtų mygtukas „apply scene 3 again“, kuris daro tą patį ② žingsnį.

---

## Santrauka viena lentele

| # | Kur | Kas | Kas pasikeičia |
|---|---|---|---|
| 1 | `ChatInput.tsx` | žymė iš pažymėtos scenos, Send | – |
| 2 | `trpc/agent.ts`, `step7Message` | Zod patikra, žinutė „waiting“ | paleidimas: `messages` |
| 3 | `agent.ts` `continueRun → work → takeUpWork` | darbininkas paima žinutę | – |
| 4 | `step7Route` + `routeMessage` (Sonnet) | ką keisti, patikra kodu | paleidimas: žinutė „working“ + `targets` |
| 5a | `rewriteScene` (Opus) | nauji žodžiai | paleidimas: `script.scenes[2]` |
| 5b | `generateVoice` (ElevenLabs) | naujas balsas | paleidimas: `voice.scenes[2]`, garso failas |
| 5c | `changeScenePictures` (Opus ×2–3) | nauji blokai + judesys | paleidimas: `blocks.scenes[2]`, `motion.scenes[2]` |
| 5d | `finishWork` | žinutė „done“ + agento atsakymas | paleidimas: `messages` |
| 6 | `ChatMessages.tsx` → `projectFromBlocks(…, 2)` → `withAgentVoice` → `AutoSave` | 3 scena perstatoma, balsai sudedami iš naujo | **projektas**: 3 scena ir visų klipų laikai |
