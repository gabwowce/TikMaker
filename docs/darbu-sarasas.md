# Darbų sąrašas

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
4. 10–15 kompozicijų iš dizaino kadrų.
5. Tavo stiliaus aprašas iš `my-style/` kadrų.

## Programuojam dabar (baigiamasis)

| # | Darbas | Kas keičiasi kode |
|---|---|---|
| 1 | Žinių bazė | `knowledge/` failai + Zod schemos (šablonai, formulės, kompozicijos, stilius) |
| 2 | Scenarijus | šablono parinkimas → 3 kabliukai (pasirinkimai tik kūrybinėms vietoms) → scenarijus |
| 3 | Faktai | nebūtinas šaltinio laukas; Claude paieškos įrankis trūkstamiems faktams; faktų sąrašas su nuorodomis |
| 4 | Scenos plano plėtra | `scene.plan`: + `act`, `connectionToNext`, `transitionPhrase`, `continuity` |
| 5 | Kompozicijos | naujas duomenų failas su kompozicijomis; kompiliatorius iš jų sudeda antraštę + vizualą + akcentus |
| 6 | Tekstas ir garsai pagal balsą | elementas ir garso efektas atsiranda ant nurodyto balso žodžio (iš ElevenLabs laikų) |
| 7 | Tęstinumas | taisyklė: ta pati tema gretimose scenose → carry + keyframe zoom vietoj kirpimo |
| 8 | Išteklių vietos | REC / IMG / VID su aprašymu; ataskaitoje gamybos planas |
| 9 | Patikra | taisyklės su ribomis iš statistikos; vertinimas iš kadrų 1–2 kartus per video |
| 10 | Taisymo ciklas, UI, ataskaita | kaip `docs/mano-planas.md` |

## Jei spėsim

- Kadrų vertinimas su DI (jei ne, patikra tik taisyklėmis).
- Antras projektas su kitu stiliumi (įrodo, kad sistema universali).

## Vėliau (po baigiamojo)

- Stiliaus ištraukimas iš kliento kadrų automatiškai.
- Keli stiliai: kiekvienam projektui savas (spalvos, šriftai pagal projektą).
- Nuotraukų ir video generavimas per API (promptai jau bus).
- Agentas, kuris kuria naujus komponentus.
- Serijų gamyba (daug video iš vieno sąrašo).
