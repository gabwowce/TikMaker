# TikMaker: kas tai yra, ko jam reikia ir planas (2026-11-07)

## Kas yra TikMaker

**Automatizuota studija edukaciniams ir pasakojamiesiems trumpiems video**
(TikTok, Reels, Shorts), kurie **užkabina ir išlaiko žiūrovą**. Turinio pavyzdžiai:
faktai, „3 Claude Code paslaptys“, instrukcijos, įrankių paaiškinimai su ekrano
įrašais, istorijos.

Ko TikMaker nedaro: reklaminių „wow“ filmukų apie produktus (launch film).
Tam yra kiti įrankiai.

Kam jis skirtas:
- **tau**: kanalas apie AI įrankius (demo, instrukcijos, edukacija) ir
  netiesioginė TikMaker reklama („made with TikMaker“ pabaigoje, CTA);
- **tau vėliau**: antras kanalas su istorijomis;
- **kitiems vėliau**: tas pats tikslas (peržiūros, affiliate, savo produkto
  reklama), tik jų kanalui ir jų produktui.

Kanalas = **workspace**: auditorija, tikslas (peržiūros / affiliate / produktas),
produkto ekranai, prekės ženklo rinkinys (šriftas, spalvos, fonas, subtitrai),
žinomi faktai.

## Kas lemia kokybę (pagal svarbą)

1. **Scenarijus ir hook** – jau stiprus: šablonai, formulės, klausimai, kai
   agentas nežino.
2. **Vaizdai**: ekrano įrašai + aiškus paaiškinamasis motion dizainas su
   „prekybine“ išvaizda – paprasta, bet su wow. **Čia dabar silpniausia vieta.**
3. **Balsas, subtitrai, garsas** – balsas ir subtitrai veikia, garsas silpnas.
4. **Agentas pats pasitikrina** – peržiūra akimis veikia.
5. **Viską galima pataisyti žinute** – pokalbis veikia.

## Sprendimas dėl vaizdų: vienas kelias, ne du režimai

Eksperimentas parodė, kad Claude, rašantis scenų kodą pagal skilą, smarkiai
lenkia bibliotekos blokų rinkimą. Siūlau **ne pridėti antrą režimą, o
pakeisti vaizdų žingsnį** (taip pat, kaip anksčiau išmetėm senus maketus –
vienas kelias, be senų atšakų):

- vaizdus rašo **Claude kodu**, kiekvienai scenai;
- pagal **tris skilų sluoksnius**:
  1. **oficialus Remotion skilas** – kaip techniškai teisingai rašyti;
  2. **TikMaker paaiškinamojo motion skilas** – mūsų žanras: vienas pagrindinis
     vaizdas, aiškumas, sinchronizacija su žodžiais, kas užkabina;
  3. **kanalo prekės ženklo rinkinys** – tavo šriftas, spalvos, fonas,
     subtitrai, logotipai, nuotraukų ir įrašų vietos;
- **biblioteka nedingsta, bet tampa statybinėmis dalimis**: subtitrai, fonas,
  įrašo rėmelis, nuotraukos vieta, logotipai. Jas naudoja sugeneruotas kodas,
  o ne agentas renkasi iš blokų sąrašo.

Viename kanale vienas stilius, todėl pasirinkimų formoje nereikia.

## Kaip tai atrodo redaktoriuje

- Sugeneruota scena projekte yra **viena „kodo scena“**. Laiko juostoje ji
  rodoma su balsu, subtitrais ir trukme kaip ir dabar, ją rodo Player.
- Skilas reikalauja, kad kodas **išvardintų, ką galima keisti**: tekstus,
  nuotraukų ir įrašų vietas, skaičius. Inspector'ius juos rodo kaip formą.
- Kas formoje netelpa (išdėstymas, judesys) – **žinute**: „3 scenoje padaryk
  vaizdą didesnį“ → agentas perrašo tą sceną ir peržiūri kadrus.

## Ką imti iš repozitorijų (ir ko ne)

| Repo | Ką imam | Kada |
|---|---|---|
| **argo** | Playwright pats paspaudo programą ir įrašo ekraną. Agentas pagal įrašo užklausą parašo scenarijų paspaudimams ir **pats įrašo TikMaker ekranus** – tau nereikia įrašinėti | 2 etapas |
| **video-director** | jų taisykles ir QA patikras perkeliam į mūsų peržiūrą (rubriką) | kartu su 1 etapu |
| **earshot** | idėją, kaip agentui „išgirsti“, ar garsas krenta ant vaizdo | 3 etapas |
| **reanimate** | perkelti judesį iš pavyzdinio video į skilą | jei reikės |
| take-one | palyginti jų peržiūros eigą su mūsų | tik pažiūrėti |
| huashu-motion, rossark, explainroo, HyperFrames | ne mūsų formatas arba kitas variklis | – |

## Planas

0. **Užbaigti eksperimentą (4 bandymas):** official skilas + paaiškinamojo
   motion skilas + prekės ženklo rinkinys su nuotraukų ir įrašų vietomis,
   tame pačiame 11 teste. Žiūrim MP4 ir nusprendžiam.
1. **Kodo scenos agente:** vaizdų žingsnis rašo scenas, peržiūra jas tikrina,
   redaktoriuje kodo scena su redaguojamais laukais, pokalbis jas taiso.
   Blokų rinkimo žingsnis išmetamas.
2. **Automatiniai ekrano įrašai** (argo idėja) TikMaker ekranams.
3. **Garsas:** efektai ant tinkamų kadrų, muzika.
4. **Antras kanalas – istorijos:** savo prekės ženklo rinkinys, istorijų
   skilas, nuotraukų vietos (vėliau galbūt generuojami vaizdai).
5. **Personažas su veidu** per kokį nors API – vėliau. Bet jau 1 etape
   paliekam jam vietą kadre („presenter“).
6. **Kitiems žmonėms:** workspace kūrimas formoje, „made with TikMaker“ pabaigoje.

**Ko nedarom:** naujų bibliotekos blokų, dviejų režimų, stilių pasirinkimų
formoje, launch filmukų.

## Baigiamajam darbui

1 etapas keičia vieną agento žingsnį: vietoj „išdėstymas iš bibliotekos“
lieka „vaizdai kodu pagal skilus“. Reikalavimus apie išdėstymo parinkimą
(FR-11 ir gretimus) reikėtų peržiūrėti su vadovu.
