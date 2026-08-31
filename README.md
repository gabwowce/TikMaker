# TikMaker

## Paleidimas kitame kompiuteryje

Reikia Node.js 22 arba naujesnės versijos.

```bash
git clone https://github.com/gabwowce/TikMaker.git
cd TikMaker
npm install
npm run dev
```

Visi naudojami logotipai, vizualai, garsai ir šriftai yra repozitorijoje.
Paleidžiant projektą jie automatiškai sinchronizuojami iš `ai/`, `props/`,
`sfx/` ir `fonts/` į `public/` katalogą.

Jei assetai laikomi kitur, nukopijuokite `.env.local.example` į `.env.local`
ir pakeiskite ten esančius kelius. Įprastam paleidimui `.env.local` nereikia.

Visi išsaugoti video ir storyboard'ai taip pat keliauja su repozitorija —
`projects/*.json` ir `storyboards/*.json`. Redaktorius juos įkelia paleidžiant,
tad kitame kompiuteryje biblioteka atrodo lygiai taip pat. Kiekvienas
išsaugojimas įrašo failą, todėl po darbo pakanka juos sukomitinti:

```bash
git add projects storyboards public/assets/custom
git commit -m "Update videos"
git push
```

## Komandos

```bash
npm run dev             # redaktorius
npm run build           # production build
npm run typecheck       # TypeScript patikra
npm run assets:sync     # rankinis assetų sinchronizavimas
npm run studio          # Remotion Studio
```
