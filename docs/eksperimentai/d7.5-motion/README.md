# D7.5 eksperimentas: garsai ir efektai (2026-11-02)

DI vienu kvietimu suplanuoja viso video judesį ir garsus (perėjimas, kaip atsiranda
tekstas ir paveikslėliai, išryškintas žodis, vienas garsas scenai), renkantis tik iš
TikMaker efektų. Lyginti du žinių šaltiniai:

- **A** – Melvynx/video-agent-skills `short-editing` taisyklės (MIT)
- **B** – šablono sėkmingų video „partitūros“ iš `docs/bd/analizes/` – **pasirinkta**

Aklas testas su 5 idėjomis (`compare-motion-key.json`): skirtumas tarp A ir B mažas –
kadrą lemia ne garsai, o tai, kas jame nupiešta (REC vietos). Kodas išimtas iš
projekto, kol bus pereitas žingsnis po žingsnio:

- `pickMotion.ts` → `server/agent/prompts/`
- `4-building.motion.ts` → `src/agent/run/4-building.ts` pabaiga
- `applyMotion.ts` → `src/agent/compileProject.ts` pabaiga
- `compareMotion.ts`, `compareMotionBatch.ts` → `scripts/` (palyginimui)
