# Kaip rašyti storyboard JSON

Storyboard yra **scenarijaus sluoksnis** — atskiras nuo `projects/*.json`.
Schema: [`src/schema/storyboard.ts`](../src/schema/storyboard.ts).
Redaguoti galima ir editoriaus **Storyboard** režime (Import JSON / Export JSON),
bet failas rašomas ranka lygiai taip pat gerai.

Pavyzdys, kuris tikrai parsina: [`claude-browser-test.json`](claude-browser-test.json).

---

## 1. Failo forma

```json
{
  "id": "claude-browser-test",
  "title": "Claude Code can test your app",
  "status": "draft",
  "targetDuration": 30,
  "beats": []
}
```

| Laukas | Privalomas | Taisyklė |
| --- | --- | --- |
| `id` | taip | Stabilus, kebab-case, be tarpų. **Nekeisk jo** — importas atpažįsta storyboard'ą pagal `id` ir atnaujina esamą įrašą; naujas `id` sukuria antrą kopiją. |
| `title` | taip | Video pavadinimas žmogui. Iš jo paveldi ir sugeneruotas projektas. |
| `status` | ne (`draft`) | `draft` \| `ready` \| `produced`. Tik tau — mechaninės reikšmės neturi. |
| `targetDuration` | ne | Sekundės (max 600). Header'yje palyginama su beat'ų suma; viršijus — skaičius parausta. Trumpai formai: 20–40. |
| `beats` | taip | Masyvas. Tvarka masyve = tvarka video. |

Failo vardas — `storyboards/<id>.json`. Editoriaus Export duoda
`<id>.storyboard.json`; pervadink į `<id>.json`, jei dedi į repo.

## 2. Beat'o forma

```json
{
  "id": "beat-3",
  "role": "reveal",
  "purpose": "Turn the idea over — the thing they didn't know.",
  "voiceover": "But Claude Code can now use Chrome.",
  "onScreenText": "Claude Code + Chrome",
  "visualPlaceholder": "Chrome logo, tool-logo visual",
  "durationSeconds": 2.5,
  "notes": ""
}
```

Privalomi tik `id` ir `role`. Visa kita — neprivaloma, bet žr. taisykles žemiau.

`id` turi būti unikalus **šio storyboard'o viduje**. `beat-1`, `beat-2`, … visiškai
tinka; jokios prasmės iš skaičiaus neišimama, tvarką lemia masyvas.

## 3. `role` — vienintelis laukas su mechanine reikšme

Rolė nusprendžia, kokio tipo scena bus sugeneruota. Todėl ji uždaras sąrašas:

| `role` | Sugeneruoja sceną | Kada |
| --- | --- | --- |
| `hook` | `hook-centered` | Pirmas kadras. Sustabdo scrollinimą. |
| `problem` | `hook-visual` | Skausmas, kurį žiūrovas jau pažįsta. |
| `solution` | `visual-explainer` | Kas tą skausmą išsprendžia. |
| `reveal` | `hook-visual` | Posūkis — tai, ko jie nežinojo. |
| `step` | `visual-explainer` | Vienas konkretus žingsnis. |
| `demo` | `screen-demo` | Rodai, kaip tai vyksta ekrane. |
| `proof` | `screen-demo` | Rezultatas, o ne pažadas. |
| `payoff` | `takeaway` | Nauda viena eilute. |
| `cta` | `takeaway` | Vienas kitas veiksmas. |

Rink rolę pagal tai, **ką kadras daro**, o ne pagal tai, kaip norėtum, kad
atrodytų — sceną vis tiek perdarysi Scenes režime. Kartoti tą pačią rolę galima
(trys `step` iš eilės yra normalu).

## 4. `voiceover` vs `onScreenText` — tai NE tas pats

- `voiceover` — **sakoma** eilutė, pilnu sakiniu. Ji nustato scenos ilgį
  (`≈ žodžiai / 3.2 + 0.5s`) ir keliauja į `scene.vo`.
- `onScreenText` — **skaitoma** eilutė. Tai VO suspaudimas, ne transkriptas.
  Ji tampa scenos `headline`.

Taisyklės:

1. **Rašyk abu.** Jei `onScreenText` nėra, headline'as krenta į `voiceover`, o
   pilnas sakinys ekrane yra per ilgas.
2. `onScreenText` — iki ~8 žodžių. Trumpesnis tekstas > mažesnis šriftas.
3. Nekartok VO žodis žodin. VO: „Normally Claude writes the code, then you test
   the app yourself." → ekrane: „Claude writes. You test."
4. **Jeigu beat'as nori daugiau nei ~7s VO — jis per ilgas.** Skaldyk į du
   beat'us, netrumpink trukmės.

## 5. `durationSeconds` — dažniausiai jo NEREIKIA

- **Yra `voiceover` → palik `durationSeconds` neįrašytą.** Sugeneruota scena
  liks AUTO ir ilgį apskaičiuos `resolveSceneDuration` iš VO + ekrano teksto.
  Skaičius, įrašytas prieš įrašant garsą, yra planas, o ne matavimas.
- **Nėra `voiceover` → įrašyk.** Kito signalo nėra.
- Įrašytas skaičius vis tiek naudingas storyboard'e: iš jo skaičiuojama bendra
  trukmė, kol VO dar neparašytas. Kai VO atsiranda — jį galima ištrinti.
- Max 60. Trumpiau nei 2.0s bet kuriai scenai yra subliminalu (`MIN_SCENE_SECONDS`).

Bendra suma header'yje = `durationSeconds`, o kur jo nėra — VO kalbėjimo laikas.
Tuščias beat'as prisideda 0s, todėl pusiau parašytas storyboard'as nemeluoja.

## 6. `visualPlaceholder` — proza, ne konfigūracija

Tai sakinys apie tai, **ką reikia parodyti**, o ne `VisualConfig`. Rašant
scenarijų dar nežinai, kuris komponentas tai piešia — ir nereikia žinoti.

- Aprašyk **rezultatą, o ne etiketę**: „menu, kuris atsidaro paspaudus ESC" yra
  stipriau nei „ESC klavišas".
- Vienas didelis vizualas viename kadre. Jei placeholder'yje išvardinti trys
  dalykai — tai trys beat'ai.
- Dev temoms rašyk dev daiktus: terminalas, diff'as, klavišas, įrašas — ne
  abstrakti klipartinė iliustracija.

Šis tekstas (kartu su `notes`) nukeliauja į `scene.notes` ir lieka matomas
Inspector → Content → Notes. Jis niekada nerenderinamas.

## 7. `purpose` ir `notes`

- `purpose` — kodėl šis beat'as apskritai yra video. Tai apsauga nuo sąrašo
  kadrų, kurie kiekvienas atrodo gerai ir kartu nesudaro nieko.
- `notes` — viskas kita, ką turi žinoti montažas („čia reikia riser'io", „nufilmuoti
  iš naujo").

Abu — tik tau, į vaizdą nepatenka.

## 8. Video forma

Įprastas skeletas (toks ir sukuriamas paspaudus „New Storyboard"):

```
hook → problem → reveal → demo → proof → payoff → cta
```

Kiti veikiantys ritmai:

```
hook → problem → solution → step ×N → payoff → cta      (roadmap / how-to)
hook → reveal → demo → proof → cta                       (tool demo)
```

- 4–8 beat'ai plius tiek `step`'ų, kiek turinys iš tikrųjų turi. Nepildyk iki
  apvalaus skaičiaus.
- Vienas beat'as = viena mintis. Jei `onScreenText` turi „ir" — tai du beat'ai.
- `hook` visada pirmas, `cta` visada paskutinis.
- Gylis laimi prieš aprėptį: trys dalykai, parodyti kaip skausmas → sprendimas,
  laiko žiūrovą geriau nei keturi paminėti pravažiuojant.

## 9. Prieš spaudžiant Generate Scenes

- [ ] Kiekvienas beat'as turi `role` ir `purpose`.
- [ ] Kiekvienas beat'as turi arba `voiceover`, arba `durationSeconds`.
- [ ] `onScreenText` ≤ ~8 žodžių ir nėra VO kopija.
- [ ] Bendra trukmė telpa į `targetDuration`.
- [ ] Nė vieno beat'o VO nėra ilgesnio nei ~7s.
- [ ] Failas parsina: Storyboard režimas → Import JSON (klaida rodoma header'yje,
      ne konsolėje).

Generate Scenes atidaro **naują** projektą — atidarytas projektas lieka nepaliestas.
Todėl scenarijų galima pergeneruoti tiek kartų, kiek reikia, kol dizaino dar nėra;
kai scenos jau apipavidalintos, storyboard'as lieka istorija, o dirbama Scenes režime.
