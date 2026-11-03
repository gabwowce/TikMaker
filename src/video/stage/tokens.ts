// Tamsaus „stage“ išdėstymo vertės (docs/motion-stilius.md; pavyzdžiai –
// docs/bd/kadrai/insiderforce/). Kadras 1080x1920.
// Sandara kaip InsiderForce: viršuje vienas didelis vaizdas, apačioje didelis
// kinetinis tekstas (tai, kas sakoma), žemiau – ženklas.
export const stage = {
  // Spalvos ir šriftai – iš stiliaus paketo (pack.tsx), ne čia.
  // Zonos (px nuo viršaus)
  visualTop: 230,
  visualBottom: 1080,
  visualCenterY: 655,
  captionTop: 1130,
  brandY: 1560,
  // Turinio plotis – ~85 % kadro
  contentWidth: 920,
  // Kinetinis tekstas
  captionSize: 96,
  captionLine: 1.04,
};
export const shadows = {
  card: [
    "inset 0 1px 0 rgba(255,255,255,0.10)",
    "0 6px 16px rgba(0,0,0,0.45)",
    "0 40px 80px rgba(0,0,0,0.6)",
  ].join(", "),
  coin: [
    "inset 0 2px 0 rgba(255,255,255,0.12)",
    "0 10px 24px rgba(0,0,0,0.5)",
    "0 30px 60px rgba(0,0,0,0.45)",
  ].join(", "),
};
