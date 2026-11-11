# Temos v2: kaip renkam ir vertinam (2026-11-10)

## Kodėl v1 nesuveikė

video-3 („Built with AI #1“) ir video-4 (žaidimas) atmesti: neįdomu, žiūrovas
nieko nepasiima, niekas nežiūrės.

1. **Šaltiniai – programuotojų.** HN „Show HN“, YouTube „I built with Claude
   Code“ – juos skaito kūrėjai, ne paprastas TikTok žiūrovas.
2. **Balas apdovanojo „wow“.** „Wow“ ir „tu irgi gali“ – 55 %. Ar žmonės to
   nori dabar ir ar jau visi tai matė – nevertinta.
3. **„Vertė“ buvo kūrėjo rezultatas.** „Sukūriau žaidimą per valandą“ – tai
   įrodymas, ne tai, ką pasiima žiūrovas. Vertės patikra tokią idėją praleido
   kaip „strong“.
4. **Rankomis ir be skaičių.** Nebuvo trumpų video peržiūrų ir palyginimo su
   kanalų vidurkiu.

## Kaip dabar

### 1. Pradedam nuo paklausos

Skeneris (`npm run topics:scan`) kas kartą surenka:
- **YouTube** – šios savaitės video pagal tai, ką auditorija rašo paieškoje
  (16 paieškų, `knowledge/workspaces/dev/topics.json`), rūšiuota pagal
  peržiūras. Kiekvienas palygintas su to kanalo įprastomis peržiūromis:
  **×N**. ×5 ir daugiau – žmones patraukė tema, ne kanalo dydis.
- **Google paieškų tendencijos** (US, GB) – ką šiandien ieško paprasti žmonės.
- **AI naujienos** (The Verge, TechCrunch, OpenAI, Google) – kas nauja šią savaitę.
- **Hacker News** – tik papildomas ženklas: insideriai nėra auditorija.

### 2. Vartai – bent vienas „ne“ ir tema atmetama

1. **Nauda žiūrovui.** Po video jis gali kažką padaryti arba žino kažką, kas
   keičia jo veiksmus: įrankis ir kam jis, nustatymas, promptas, metodas,
   skaičius, nemokama alternatyva.
2. **Ne perkramtyta.** „AI pastatė žaidimą / app / svetainę / animaciją iš
   aprašymo“ be posūkio, kurio žiūrovas nematė, atmetama.
3. **Kanalo tema** – ne iš „ko nedarom“ (`workspace.json` → `offTopic`).
4. **Padaroma** su ekrano įrašu ir savo bandymu šią savaitę.

### 3. Balas (0–100)

| Dalis | Max | Klausimas |
| --- | --- | --- |
| Paklausa | 30 | Ar žmonės to nori DABAR? ×N, peržiūros per dieną, paieškos, keli nepriklausomi signalai |
| Nauda | 25 | Ar žiūrovas išsisaugotų ar pasidalintų? |
| Hook | 15 | Ar ne programuotojas supras per 2 s ir norės žinoti daugiau? |
| Originalumas | 15 | Ar dar mažai video, ar turim kampą, kurio kiti neturi (savo testas, palyginimas, skaičius)? |
| Šviežumas | 15 | Ar tai nauja šią savaitę, ar yra priežastis, kodėl svarbu dabar? |

**Daryti** – 70+ ir praeiti visi vartai, **gal** – 55–69.

### 4. Perkramtymo patikra

Kiekvienai temai – YouTube paieška per mėnesį (pirmas puslapis, pagal
peržiūras). Paieškos puslapyje daug pusiau susijusių video, todėl vertintojas
nurodo, kurie rezultatai tikrai apie tą pačią temą (jų numerius), o kortelėje
skriptas parašo jų skaičių, kiek su 100K+ peržiūrų ir populiariausią. Matai,
ar įeini į tuščią, ar į perpildytą temą – ir ko trūksta esamiems video (tai ir
yra mūsų kampas).

### 5. Skaičiai – iš šaltinių

Modelis tik nurodo signalų numerius (Y12, T3…). Peržiūros, ×N, taškai ir
nuorodos kortelėje rašomi iš surinktų duomenų – modelis jų prisigalvoti negali.

## Video agento vertės patikra – tas pats požiūris

`server/agent/prompts/checkValue.ts`:
- nauda – tai, ką pasiima **žiūrovas**; kūrėjo projektas ar rezultatas – tik
  įrodymas, skaičiuojasi per tai, ko jis išmoko;
- „AI pastatė X iš aprašymo“ – perkramtyta, jei nėra posūkio.

Kanalo kryptis (`workspace.json` → `direction`) suderinta su tuo pačiu.

Išbandyta su tikru modeliu (2026-11-10):
- video-4 (žaidimas) – **weak**: „žiūrovai tai matė, „you just describe it“ nieko neduoda“;
- video-2 (3D miestas) – **weak**: „ką galima nusikopijuoti, paslėpta už CTA“;
- idėja su testu, palyginimu ir rezultatu, kurį žiūrovas gali pakartoti – **strong**.

## Kaip paleisti

```
npm run topics:scan
```

Užtrunka ~5–10 min. Rezultatas: `docs/temos/<data>-temos.md` (kortelės) ir
`db/topics/<data>.json` (viskas, būsimai „Temos“ skilčiai). Paieškos ir
šaltiniai – `knowledge/workspaces/dev/topics.json`.

## Ko dar trūksta

- **TikTok duomenų** – didžiausia spraga. TikTok paieškai reikia mokamo
  įrankio (~1–4 $/mėn., `C-api-kaina.md`). Kol kas trumpų video paklausą
  rodo YouTube.
- **Tavo video rezultatų.** `content/log.md` tuščias. Įrašyk peržiūras po 48 h,
  ir skeneris galės mokytis, kas veikia būtent tavo kanale.
- Reddit skriptams užblokuotas.
