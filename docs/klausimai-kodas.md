# Agentas klausia (pokalbio 3 etapas) ir nauja Visuals skiltis

## 1. Agentas klausia, kai nežino

Kai agentas nežino tikro fakto (kiek trunka, ką produktas daro, ką rodo
ekranas), jis neišsigalvoja, o paklausia. Klausti gali trys žingsniai:
šablonas, scenarijus ir blokai.

### Kodas

**`src/agent/run/asking.ts`** (naujas, leaf modulis) – ką modelis gali grąžinti:

```ts
export const askingFromAi = {
  questions: z.array(questionFromAi).max(3).optional(),   // { question, why, options? }
  assumptions: z.array(z.string()).max(3).optional(),    // ką nusprendė pats
};
```

Šie du laukai įdėti į `templateFromAi`, `scriptFromAi` ir `blocksFromAi`.

**`server/agent/prompts/productScreens.ts`**:
- `whenToAsk(asked)` – taisyklė modeliui: klausti tik tada, kai atsakymas
  pakeis video ir nei idėja, nei faktai to nepasako. Kitaip nuspręsti pačiam
  ir parašyti prielaidą (`assumptions`). Jei žingsnis jau klausė šiame
  paleidime: „do not ask again“.
- `creatorFacts(workspace)` – „Facts from the creator (true – use them)“.
  Pridedama prie visų promptų, kurie rašo ar rodo video (šablono, hook,
  scenarijaus, blokų, scenos perrašymo).

**`server/agent/tools/ask.ts`** (naujas):

```ts
if (await askIfNeeded(job, "writeScript", script)) return;   // žingsnyje
```

- **`askIfNeeded`** – jei modelis klausia, o šis žingsnis dar neklausė:
  įrašo agento žinutę su klausimais (`askedBy`), nustato būseną
  `awaiting_answers` ir `pausedFrom` (kuris žingsnis klausia), o žingsnio
  atsakymo **neišsaugo** – jis bus perdarytas su atsakymais. Jei neklausia,
  bet turi prielaidų, parašo „What I assumed (script): …“.
- **`step3Answer`** (klausimų kortelė, `agent.answer`) – įrašo atsakymus.
  Pažymėti „Remember“ įrašomi į `knowledge/workspaces/<id>/workspace.json`
  (`facts`). Paleidimas grąžinamas į to žingsnio pradžią (`resumeStatus`,
  tas pats kaip po pauzės), ir žingsnis kviečiamas iš naujo.
- **`answerFromMessage`** – jei vietoj kortelės parašai žinutę, ji tampa
  atsakymu į neatsakytus klausimus.

**`server/agent/job.ts`** – `job.workspace` dabar sudeda kanalo faktus
(`facts`) ir šio paleidimo atsakymus (`answeredFacts`). Taip kiekvienas
vėlesnis promptas juos gauna savaime.

**`server/agent/agent.ts`** – po šablono, scenarijaus ir blokų tikrinama
`asking(job)`. Jei agentas klausia, darbas sustoja ir laukia.

**Skydelis** – `src/editor/agent/QuestionsCard.tsx`. Kiekvienam klausimui:
kodėl klausia, variantai mygtukais, laukas savo atsakymui ir „Remember for
every video of this channel“. Apačioje mygtukai **Answer** ir **Decide
yourself**. Atsakius kortelėje lieka atsakymų santrauka.

### Kaip veikia vienas klausimas

1. Scenarijaus žingsnis grąžina `questions: [{ question: "How long does
   generating take?", options: ["~2 min", "~5 min"] }]`.
2. `askIfNeeded` → žinutė su klausimu, `awaiting_answers`, scenarijus neįrašomas.
3. Pasirenki „~2 min“ → `agent.answer` → `step3Answer` → būsena
   `awaiting_hook` → `continueRun` → scenarijus rašomas iš naujo.
4. Prompte dabar yra: „Facts from the creator: How long does generating
   take? – ~2 min“. Antrą kartą jis nebeklaus („do not ask again“).

Testas: `server/__tests__/agent.test.ts` – „asks when it does not know…“.

## 2. Visuals skiltis

**`src/editor/library/VisualLibrary.tsx`**:
- **paieška** viršuje (blokai, logotipai, daiktai, importai, seni maketai);
- **Ask the agent · scene N** – kai pažymėta agento scena, parašai, ką ji
  turi rodyti. Tai išsiunčiama kaip žinutė apie tą sceną, ir agentas parenka
  vaizdus iš naujo. Atsakymas ateina į agento skydelį;
- **Blocks · the agent's** – tie patys blokai, iš kurių renkasi agentas,
  su tikrais miniatiūriniais vaizdais (`catalogBlocks`). Paspaudus blokas
  įdedamas kaip sluoksnis į stage zoną;
- tavo importai, logotipai, daiktai;
- **More · older presets** – seni maketai suskleisti (paieškos metu atsiveria).

**`src/video/stage/catalogBlocks.ts`** (naujas, leaf) – blokų pavyzdžiai
vienoje vietoje: juos naudoja ir „StageCatalog“ kompozicija, ir Visuals skiltis.
Pridėtas ir `picture` pavyzdys.
