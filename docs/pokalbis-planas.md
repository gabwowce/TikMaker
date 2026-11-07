# Pokalbis su agentu ir agento klausimai – aprašas prieš kodą (2026-11-06)

Tikslas: skydelis veikia kaip Claude Code. Bet kuriame etape gali parašyti agentui, ką pakeisti.
Kai agentas ko nors nežino, jis klausia. Patvirtinimo mygtukai niekada nesusipainioja su žinute.

---

## 1. Kas keičiasi naudotojai

**Dabar:**
- komentuoti galima tik scenarijų (laukelis scenarijaus kortelėje, šalia „Approve“);
- vieną sceną galima taisyti atskiroje kortelėje;
- kabliuko, judesio ir balso pakeisti negalima.

**Bus:**

```
┌─ AI agentas ───────────────────────────┐
│ [žingsnių juosta]                        │
│ idėja · šablonas · kabliukai · ...       │  ← kortelės kaip dabar; jų sprendimo mygtukai
│ ┌ Agentas: 2 klausimai ─────────────┐    │     (Use this hook, Approve) – TIK kortelėse
│ │ 1. Kiek trunka tikras generavimas? │    │
│ │    [~2 min] [~5 min] [nežinau]     │    │  ← agento klausimai – irgi žinutė
│ │ 2. ...                             │    │
│ │ [ ] prisimink kitiems video        │    │
│ │ [Atsakyti]  [Spręsk pats]          │    │
│ └────────────────────────────────────┘    │
│ Tu: 3 scenoje rodyk pokalbį burbuliukais  │  ← tavo žinutės istorijoje
│ Agentas: ✓ Pakeičiau 3 scenos vaizdus     │
├──────────────────────────────────────────┤
│ [📎 Scena 3 ×] [📎 Sluoksnis: chat ×]     │  ← kas pažymėta redaktoriuje
│ [ Parašyk agentui…                    ]   │  ← laukelis VISADA apačioje
│                                  [Siųsti] │  ← tik siunčia, niekada nepatvirtina
└──────────────────────────────────────────┘
```

- Laukelis visada yra apačioje, bet kuriame etape.
- „Siųsti“ tik siunčia žinutę. Ji niekada nieko nepatvirtina.
- Ką pažymėjai redaktoriuje (sceną, sluoksnį, tekstą), atsiranda virš laukelio kaip žymė. Žymę galima nuimti (×).
- Kai žymės nėra, agentas iš teksto supranta, ką keisti.
- Kai pakeitimas paliečia vėlesnius etapus, agentas paklausia, ar perdaryti ir juos. Pavyzdys: pakeiti kabliuką, kai video jau pastatytas.

---

## 2. Duomenys (`src/agent/run/7-chat.ts`, naujas)

```ts
// Ką liečia žinutė – iš žymės arba agento nuspręsta
export const chatTarget = z.object({
  kind: z.enum(["hook", "script", "pictures", "motion", "voice", "video"]),
  sceneIndex: z.number().int().min(0).optional(), // kai liečia vieną sceną
  objectId: z.string().optional(),                // kai liečia vieną sluoksnį
});

// Žymė – kas buvo pažymėta redaktoriuje siunčiant
export const chatAttachment = z.object({
  sceneIndex: z.number().int().min(0),
  objectId: z.string().optional(),
  label: z.string(),            // „Scena 3“, „Sluoksnis: chat“
});

// Agento klausimas
export const agentQuestion = z.object({
  id: z.string(),
  question: z.string(),
  why: z.string(),                       // kodėl klausia – kas nuo to priklauso
  options: z.array(z.string()).max(4).optional(),
  answer: z.string().optional(),         // tavo atsakymas; nėra + skipped – „spręsk pats“
  skipped: z.boolean().optional(),
  remember: z.boolean().optional(),      // įrašyti į kanalo žinias
});

// Viena pokalbio žinutė
export const chatMessage = z.object({
  id: z.string(),
  at: z.number(),
  from: z.enum(["user", "agent"]),
  text: z.string(),
  attachments: z.array(chatAttachment).optional(),
  target: chatTarget.optional(),          // ką agentas nusprendė keisti
  questions: z.array(agentQuestion).optional(),
  status: z.enum(["waiting", "working", "done", "error"]).optional(),
});
```

Paleidime (`run.ts`) atsiranda:
- `messages` – visa pokalbio istorija;
- `pausedAt` – kuris žingsnis laukia atsakymų.

Nauja būsena: `awaiting_answers`.

Kanalo žiniose (`workspace.json`) atsiranda `facts: string[]` – ką agentui pasakei ir liepei prisiminti.

Dabartinis scenos taisymas (`edits`) ir scenarijaus komentaras (`script.comment`) tampa žinutėmis su `target`. Seni laukai liks tik tam, kad atsidarytų seni paleidimai.

---

## 3. Srautas serveryje

### 3.1 Tavo žinutė

```
agent.message({ runId, text, attachments })
  → įrašoma žinutė (from: "user", status: "waiting")
  → continueRun → agent.ts
```

`agent.ts` žiūri į paskutinę laukiančią žinutę:

1. **Ar laukia atsakymų** (`awaiting_answers`)? Tada žinutė yra atsakymas. Jis įrašomas į klausimus, ir sustojęs žingsnis tęsiamas.
2. **Ar yra žymė?** Tada taikinys aiškus be DI:
   - žymė su scena → `pictures` tai scenai;
   - žymė su sluoksniu → `pictures` tai scenai, o promptas gauna konkretų sluoksnį.
3. **Žymės nėra.** Mažas pigus kvietimas `routeMessage` (greitas modelis, ~1–2 tūkst. žetonų) grąžina `target` arba klausimą („Kurią sceną turi omeny?“).
4. **Vykdymas pagal taikinį:**

| Taikinys | Kas vyksta | Kas paliečiama vėliau |
|---|---|---|
| `hook` | kabliukai perrašomi su komentaru → vėl renkiesi | jei scenarijus jau yra – agentas klausia: perrašyti scenarijų? |
| `script` | scenarijus perrašomas su komentaru (kaip dabar) | jei video pastatytas – klausia: perdaryti vaizdus ir balsą? |
| `pictures` + scena | vienos scenos blokai su komentaru (dabartinis 6 žingsnis) | tos scenos judesys perplanuojamas (tik ta scena) |
| `motion` (+ scena) | perplanuojamas judesys (visas arba vienos scenos) | – |
| `voice` + scena | perrašomas tos scenos balsas (jei keitėsi žodžiai) – ElevenLabs | scenos ilgis, subtitrai |
| `video` | bendras pageidavimas („trumpiau“, „daugiau įvairovės“) → agentas pasiūlo, ką keis, ir klausia patvirtinimo | priklauso nuo pasiūlymo |

5. Agentas atsako žinute: „✓ Pakeičiau …“ arba klaida. Skydelis pritaiko rezultatą projektui taip pat, kaip dabar.

### 3.2 Agento klausimai

Klausimus grąžina jau vykstantys žingsniai. Jų schemose atsiranda neprivalomas laukas `questions` (0–3):

| Žingsnis | Kada klausia (pavyzdžiai) |
|---|---|
| šablonas (`pickTemplate`) | idėja neaiški; trūksta fakto, kurio šablonui reikia (skaičius, rezultatas) |
| paieška (`research`) | reikėjo fakto, bet jo nerado |
| scenarijus (`writeScript`) | vietoj išgalvoto fakto; neaišku, ką produktas daro |
| blokai (`pickBlocks`) | neaišku, ką tiksliai rodo ekranas įrašui |

Taisyklė promptuose: klausti tik tada, kai atsakymas pakeis video. Kitaip tęsti ir parašyti prielaidą (`assumptions`), kurią matysi kortelėje.

Jei žingsnis grąžino klausimų:
- agentas įrašo žinutę su klausimais;
- būsena tampa `awaiting_answers`, o `pausedAt` – tas žingsnis;
- žingsnio atsakymas neišsaugomas, nes jis bus perdarytas su atsakymais.

Atsakius (arba paspaudus „Spręsk pats“), žingsnis kviečiamas iš naujo. Prompte jis gauna:

```
Facts from the creator (true – use them):
- Generating a video takes about 2 minutes.
```

Tie patys faktai eina ir į visus vėlesnius žingsnius. Kas pažymėta „prisimink“, įrašoma į `workspace.facts`, todėl tas faktas įeis į visų būsimų video promptus.

---

## 4. Failai

| Failas | Kas |
|---|---|
| `src/agent/run/7-chat.ts` (naujas) | žinutės, žymės, taikiniai, klausimai |
| `src/agent/run/run.ts`, `status.ts` | `messages`, `pausedAt`, `awaiting_answers` |
| `src/agent/knowledge.ts` + `knowledge/workspaces/dev/workspace.json` | `facts` |
| `server/agent/steps/7-chat.ts` (naujas) | žinutės priėmimas, maršrutas, vykdymas, atsakymai |
| `server/agent/prompts/routeMessage.ts` (naujas) | pigus „ką keisti“ kvietimas |
| `server/agent/agent.ts` | `awaiting_answers` ir žinučių apdorojimas |
| `server/agent/prompts/*` | `questions` + `assumptions` laukai, „Facts from the creator“ |
| `server/trpc/agent.ts`, `src/api/agent.ts` | `agent.message`, `agent.answer` |
| `src/editor/agent/ChatInput.tsx` (naujas) | laukelis + žymės iš redaktoriaus |
| `src/editor/agent/QuestionsCard.tsx` (naujas) | klausimai su variantais, „prisimink“, „Spręsk pats“ |
| `src/editor/agent/ChatMessage.tsx` (naujas) | tavo ir agento žinutės istorijoje |
| `RunProgress.tsx`, `ScriptCard.tsx`, `SceneEditCard.tsx` | kortelės be komentarų laukelių; `SceneEditCard` pašalinamas |

---

## 5. Etapai (kiekvienas veikia atskirai, su testais)

1. **Žinutės ir laukelis su žymėmis.** `agent.message`, istorija, taikinys iš žymės. Veikia scenarijaus komentaras (prieš patvirtinimą) ir scenos vaizdai (po pastatymo). `SceneEditCard` ir scenarijaus komentaro laukelis pašalinami.
2. **Agentas pats supranta, ką keisti.** `routeMessage`, plius nauji taikiniai: kabliukas, judesys, balsas, bendri pageidavimai, ir klausimas „perdaryti ir vėlesnius?“.
3. **Agento klausimai.** `questions` žingsniuose, `awaiting_answers`, klausimų kortelė, faktai prompte, „prisimink“ į kanalo žinias.

Po kiekvieno etapo: kas pakeista, kodas ir kaip veikia, kaip įprasta.

---

## 6. Sprendimai (patvirtinta 2026-11-06)

1. Kortelių sprendimo mygtukai (Use this hook, Approve) lieka kortelėse; žinutė niekada nieko
   nepatvirtina.
2. `routeMessage` – Sonnet.
3. Bendras pageidavimas visam video – agentas pirma pasiūlo, ką keis, ir laukia „taip“.
4. „Prisimink“ rašo į `workspace.json` (`facts`), matosi git'e.

## 7. Būklė (2026-11-06)

**1 etapas padarytas:** `src/agent/run/7-chat.ts`, `server/agent/steps/7-chat.ts`,
`agent.message` (vietoj `reviseScript` ir `editScene`), `ChatInput.tsx` (laukelis apačioje
su žymėmis), `ChatMessages.tsx` (istorija, scenos pritaikymas), `ScriptCard` be komentaro
laukelio, `SceneEditCard` ir `edits` pašalinti, būsena `editing_scene` → `answering`.
Testai praeina; laukelis su žyme „Scene 1“ patikrintas redaktoriuje, tikros žinutės nesiųsta.

**2 etapas padarytas:** rašyti bet kada (žinutė laukia, vienas darbininkas per paleidimą),
`routeMessage` (Sonnet) – taikiniai su nurodymais, nauji taikiniai `hook`, `motion`, `words`,
pasiūlymai su „Do it / No“ (`agent.decide`), įrašymas be lenktynių (`updateRun` +
`mergeMessages`). Kodas su paaiškinimais – `docs/pokalbis-kodas.md`.

**3 etapas padarytas** (2026-11-07) – aprašas su kodu: `docs/klausimai-kodas.md`.
