# 3D video – planas po BD (2026-11-02)

Bandymas „AI agents explained“ (kodas – šakoje `experiment/3d-desk`,
`src/video/custom/ai-agent-explained/`; scenarijus –
`docs/eksperimentai/ai-agent-explained-shotlist.md`) parodė, kad 3D video atrodo
gerokai solidžiau nei šablonai. Tačiau dabar jį piešia Claude Code rankomis, editoriuje
jo taisyti negalima, o kamera ir daiktai dėliojami spėjant. Šis planas yra apie tai, kaip
3D video daryti nuosekliai. Jis vykdomas po BD, nebent liks laiko.

## Kas reikalinga

| Dalis | Kas tai | Kaip tikrinama |
| --- | --- | --- |
| 3D scenarijus | Agentas po įprasto scenarijaus parašo režisūrinį planą: pasaulį, daiktus-metaforas, kiekvienos scenos kadrą (ką rodom, iš kur, pjūvis ar judesys), kas atsiranda ant kurio žodžio, garsus. | Schema (Zod) ir patikra kodu, kaip `checkScript`. |
| Kadras pagal daiktą | Kadras aprašomas ne kameros koordinatėmis, o tuo, ką rodom („robotuko veidas, stambiai, iš priekio“). Kodas pats apskaičiuoja kamerą. | Kodas tikrina, ar daiktas kadre, ar telpa tarp šoninių paraščių, ar užrašai neišlenda už saugios zonos, ar daiktai nekerta stalo. |
| Biblioteka | Aplinkos (pvz., stalas su kilimėliu) ir daiktai su pavadinimais ir veiksmais („antspaudas spaudžia“). Bendra biblioteka ir kiekvieno workspace savoji. | Naujas daiktas pirma parodomas viename kadre ir tik patvirtinus dedamas į biblioteką. |
| Sudėjimas | Kodas iš plano ir bibliotekos sudeda sceną. Piešimas ranka – tik tada, kai tinkamo daikto nėra. | Iš kiekvienos scenos išrenderinami keli kadrai ir parodomi prieš visą renderį. |

## Kameros taisyklės

Pjūvis daromas, kai keičiasi mintis. Kameros judesys – kai ta pati mintis tęsiasi toje
pačioje vietoje (priartėti prie veido, nusileisti siūlu). Pirmas scenos kadras iškart
būna teisingu kampu, be ilgo skrydžio. 2D sąsaja rodoma daikto ekrane pačiame pasaulyje,
ne kaip plokščias perdengimas, ir tomis pačiomis spalvomis kaip visas video.

## Iš kur imti modelius

Paruoštų nemokamų modelių bandymas nepavyko: stiliai nedera tarpusavyje, video atrodo
pasenęs. Lieka du keliai. Pirmas – savo piešti paprasti daiktai vienu stiliumi (kaip dabar),
kurie lieka bibliotekoje. Antras – DI 3D generatoriai (pvz., Meshy, Tripo, Hunyuan3D,
Rodin), kuriems duodamas tas pats stiliaus aprašas, kad daiktai derėtų. Fonui tinka
360° aplinkų generatoriai (pvz., Blockade Labs Skybox). Prieš renkantis reikia patikrinti
kainą, licenciją ir ar modelį galima eksportuoti GLB formatu.

## Editorius

Pilno 3D redagavimo kol kas nedarom. Pakanka, kad editoriuje būtų matomas 3D planas
(Storyboard) ir jį būtų galima pataisyti tekstu, o scena persigeneruotų.
