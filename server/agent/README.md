# AI agentas: žemėlapis

Agentas iš idėjos padaro video. Jis eina žingsniais. Po kiekvieno žingsnio
viskas įrašoma į video „bylą“ (`db/agent-runs/<id>.json`), todėl darbą galima
sustabdyti ir tęsti.

## Aplankai

| Kur | Kas tai |
|---|---|
| `agent.ts` | **Vadovas.** Pažiūri bylos būseną ir paleidžia kitą žingsnį. Būsenas keičia tik jis. |
| `steps/` | **Žingsniai**, po vieną failą kiekvienam, sunumeruoti tokia tvarka, kokia jie vyksta. |
| `tools/` | **Įrankiai**, kuriuos naudoja keli žingsniai: klausimai kūrėjui, kadrų peržiūra, kadrų piešimas, kodo versijos, vaizdų biblioteka. |
| `prompts/` | **Instrukcijos DI**, po vieną kiekvienam DI skambučiui. |
| `ai/` | **Ryšys su DI.** Tik per čia kalbama su modeliu (`llm.ts`, `claudeCode.ts`). `models.ts` nurodo, kuris skambutis kuriuo modeliu eina. |
| `job.ts`, `runs.ts` | Byla: skaityti, įrašyti, registruoti kiekvieną DI skambutį (laikas, kaina). |
| `knowledge.ts` | Žinių bazės (`knowledge/`) įkėlimas. |
| `limits.ts` | DI limitas: darbas pristabdomas, o ne sustabdomas. |

Taisyklės, kurias tikrina kodas be DI, yra vienoje vietoje:
`src/agent/rules/checkScript.ts`. Jų ribos (skaičiai) laikomos
`knowledge/shared/design-rules.json`.

## Žingsniai

| # | Failas | Ką daro | DI skambučiai | Būsenos |
|---|---|---|---|---|
| 1 | `1-idea.ts` | Forma, mygtukas Start | – | `created` |
| 2 | `2-angle.ts` | Idėjos patikra (įvertina ir **perrašo idėją**, kaip video ją papasakos) → šablonas → kabliukai. **LAUKIA**, kol kūrėjas išsirinks | `checkValue`, `pickTemplate`, `writeHooks` | `picking_template`, `writing_hooks`, `awaiting_hook` |
| 3 | `3-script.ts` | Faktai → scenarijus → taisyklių patikra → vienas pataisymas. **LAUKIA** patvirtinimo | `research`, `writeScript` | `writing_script`, `awaiting_approval` |
| 4 | `4-voice.ts` | Įgarsinimas (ElevenLabs, be DI), kad vaizdai prisitaikytų prie tikrų žodžių | – | `generating_voice` |
| 5 | `5-pictures.ts` | Claude Code kiekvieną sceną parašo kodu, kodas patikrina, ar kompiliuojasi | `writeCode` | `laying_out` |
| 6 | `6-self-review.ts` | Agentas peržiūri savo kadrus ir taiso (daugiausia 3 ratai) | `reviewFrames` | `reviewing` → `done` |
| 7 | `7-chat.ts` | Kūrėjo žinutės: eilė → ką keičia → padaro arba pasiūlo | `routeMessage` + pagal tai, ką reikia keisti | `answering` |

Tvarkos, kurios galima tikėtis:
- **Klausimų** kūrėjui gali kilti tik dviejose vietose (`tools/ask.ts`):
  idėjos patikroje (pagrindinė vieta, visko apie idėją klausiama čia) ir
  rašant scenarijų. Šablonas ir kabliukai neklausia. Po scenarijaus
  patvirtinimo agentas nebeklausinėja.
- **Idėja.** Kūrėjo įvesta idėja (`run.input.idea`) niekada nekeičiama.
  Patikra parašo patobulintą (`run.value.idea`), ir visi tolesni žingsniai
  dirba su ja (`job.input`). Seni video, kurie jos neturi, naudoja kūrėjo idėją.
- **Žinutę** galima rašyti bet kada. Ji laukia eilėje, kol agentas sustos
  ties `awaiting_hook`, `awaiting_approval` arba `done`.
- Panelė rodo 5 ekranus: Idea, Angle, Script, Building, Result. 4 ir 5
  žingsniai priklauso „Building“, 6-asis – „Result“.
