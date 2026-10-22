# Darbų sąrašas

Eiga: `docs/bd/diagramos/agento-eiga.png` (+ paaiškinimas `agento-eiga.md`).

Sprendimai:
- Kompozicija gyvena tik generuojant: kompiliatorius ją paverčia į paprastą TikMaker sceną
  su aiškiai įrašytais efektais (`animation`, `entrance`...). Rankiniam redagavimui niekas
  nesikeičia; numatytieji efektai lieka tik ranka pridėtiems elementams. Scenos `plan`
  pasižymi, iš kurios kompozicijos sukurta (`compositionId`).
- Agentas = naujas modulis esamame serveryje (`server/agent/`) + tRPC maršrutai `agent.*`,
  ne naujas serveris.
- Frontas: „Naujas video su DI“ langas (žr. žemiau, 12 punktas).

## Tau surinkti (prieš programuojant)

1. **Analizės**: 53 yra ✓. Į kiekvieno failo `manual` įrašyk `analyzedAt` ir `model`.
2. **Kabliukai**: 100+ pagal `docs/bd/kabliuku-rinkimas.md` → `docs/bd/kabliukai/`.
3. **Dizaino kadrai**: 20–30 ekrano nuotraukų gražiai sudėliotų kadrų (kuo įvairesnės
   kompozicijos) → `docs/bd/design-refs/` (pavadinimas `videoId-1.png`).
   Plius 5–10 blogų pavyzdžių (`bad-1.png`), gali būti iš savo senų video.
4. **Tavo stilius**: 10–15 kadrų, kurie atrodo taip, kaip nori, kad atrodytų TAVO
   video (gali būti tavo pačios arba kito kanalo) → `docs/bd/my-style/`.
5. **Pirmo projekto aprašas** (pusė puslapio, laisvai): kam tavo video, tonas,
   ko vengti → `knowledge/themes/dev/brief.md`.

## Aš paruošiu (iš tavo duomenų)

1. Statistikos skriptas → skaičiai taisyklėms.
2. 3 promptas atnaujintas (šablono formatas, kūrybinės vietos, tęstinumas) → šablonai.
3. Kabliukų / CTA formulės iš surinktų kabliukų.
4. Kompozicijų kalba + 15–20 pavyzdžių iš dizaino kadrų (DI kompozicijas kuria pats, pavyzdžiai jį moko).
5. Tavo stiliaus aprašas iš `my-style/` kadrų.

## Programuojam dabar (baigiamasis)

| # | Darbas | Kas keičiasi kode |
|---|---|---|
| 1 | Žinių bazė | `knowledge/` failai + Zod schemos (šablonai, formulės, kompozicijos, stilius) |
| 2 | Scenarijus | šablono parinkimas → 3 kabliukai (pasirinkimai tik kūrybinėms vietoms) → scenarijus |
| 3 | Faktai | nebūtinas šaltinio laukas; Claude paieškos įrankis trūkstamiems faktams; faktų sąrašas su nuorodomis |
| 4 | Scenos plano plėtra | `scene.plan`: + `act`, `connectionToNext`, `transitionPhrase`, `continuity` |
| 5 | Kompozicijos | DI pats kuria kadrą „kompozicijų kalba“ (zona, elemento tipas, akcento dydis); kompiliatorius paverčia į koordinates; pavyzdžiai iš `design-refs/` |
| 6 | Judesys | DI kiekvienam elementui renkasi iš judesių žodyno: atsiradimas (pop, slideUp, scaleIn…), gyvumas (Ken Burns, lėtas zoom, bounce), išėjimas; kompiliatorius paverčia į esamus `entrance` / `kenBurns` / `keyframes` |
| 7 | Tekstas pagal balsą | elementas atsiranda ant nurodyto balso žodžio (`appearsOnWord` → kadras iš ElevenLabs laikų) |
| 8 | Tęstinumas | `continuity`: `new` / `carry:<elementas>` / `zoom-into:<taikinys>`; carry → kiti elementai dedami į laisvą zoną; zoom → keyframes |
| 9 | Fokuso taškas (zoom į įrašo / nuotraukos dalį) | elemento laukas `focus` (x, y, didinimas, % nuo medijos); DI parenka zoną iš 3×3 tinklelio + aprašą („Settings mygtukas“); kompiliatorius → keyframes; redaktoriuje pataisymas vienu paspaudimu ant peržiūros + didinimo slankiklis |
| 10 | Išteklių vietos | REC / IMG / VID su aprašymu; ataskaitoje gamybos planas |
| 11 | Patikra | taisyklės su ribomis iš statistikos (pvz. vaizdas nejuda ilgiau nei N s); vertinimas iš kadrų 1–2 kartus per video |
| 12 | Taisymo ciklas, UI, ataskaita | `server/agent/` + `agent.*` maršrutai; UI: „Naujas video su DI“ (forma → eigos žingsniai → kabliukų kortelės → scenarijaus patvirtinimas → rezultatas + ataskaita), redaktoriuje išteklių vietų sąrašas ir fokuso taškas paspaudus ant peržiūros |

## Jei spėsim

- Kadrų vertinimas su DI (jei ne, patikra tik taisyklėmis).
- Fokuso taško paieška kadre su DI (įkėlus įrašą DI pats randa „Settings mygtuką“).
- Antras projektas su kitu stiliumi (įrodo, kad sistema universali).

## Garso efektai (atskiras darbas, jei spėsim, kitaip po baigiamojo)

DI agentas garsų nedėlioja: juos sudeda sistema pagal taisykles. Bet dabar sistema
tai daro nepilnai. Rasta kode:

1. **Vizualų garsai neveikia automatiškai.** `VisualsLayer.tsx` naudoja tik
   `resolveExplicitSfx`, todėl be rankinio pasirinkimo vizualas garso negauna, o
   `db/sfx-overrides.json` visiems vizualų atsiradimams nustatyta `"none"`.
2. **Scenų perėjimai be garso.** `motion.transition` (push, slide…) garso neturi.
3. **Judesiai be garso.** Keyframe zoom / perstūmimas, carry slinkimas, Ken Burns
   garso negauna, nors analizėse whoosh dažniausiai būna būtent čia.
4. **Taisyklės pagal animaciją, ne pagal prasmę.** Garsas parenkamas pagal
   animacijos pavadinimą (`slideUp` → garsas), o ne pagal tai, kas vyksta
   (skaičius, atskleidimas, klaida, sėkmė). Išimtys tik `StatCounter` ir `Checklist`.
5. **Per daug garsų tekste.** Tekstas, skaidomas į žodžius, kiekvienam žodžiui groja
   `d-word`; nėra ribos „ne daugiau kaip X garsų per sekundę“.
6. **Laikas tik kadrais.** `sfxAt` nurodomas kadrais ranka; nėra „ant žodžio X“.
7. **Neaiški sąsaja.** Garsas parenkamas sąraše prie kiekvieno elemento atskirai
   (`SfxSelect`), be perklausos; nesimato, kodėl „Auto“ parinko tą garsą ir kur
   jis bus; numatytųjų taisyklių keitimas paslėptas.

Ką daryti:
- Viena vieta taisyklėms: `įvykis → garsas` (atsiranda tekstas, atsiranda vizualas,
  perėjimas, zoom, skaičius, sėkmė, klaida, atskleidimas) + ribos (min. tarpas tarp
  garsų, maks. per sceną). Reikšmės iš analizių statistikos.
- Vienas „garsų planuotojas“, kuris pereina visą projektą ir sudeda garsus į
  laiko juostą (vietoj to, kad kiekvienas komponentas grotų savo).
- Sąsaja: garsai matomi laiko juostoje kaip žymės su priežastimi („zoom → whoosh“),
  perklausa, „pakeisti šią vietą“ / „pakeisti taisyklę visur“ / „išjungti“.
- Testai: kiekvienam įvykio tipui yra garsas arba aiškiai `none`.

## Vėliau (po baigiamojo)

- Stiliaus ištraukimas iš kliento kadrų automatiškai.
- Keli stiliai: kiekvienam projektui savas (spalvos, šriftai pagal projektą).
- Nuotraukų ir video generavimas per API (promptai jau bus).
- Agentas, kuris kuria naujus komponentus.
- Ekrano įrašymas su pelės sekimu → automatinis zoom ten, kur paspausta (kaip Screen Studio).
- Serijų gamyba (daug video iš vieno sąrašo).
