// Values of the dark "stage" layout (docs/motion-stilius.md; examples –
// docs/bd/kadrai/insiderforce/). The frame is 1080x1920.
// Built like InsiderForce: one big picture on top, big kinetic text below it
// (what is being said), the brand mark under that.
export const stage = {
  // Colours and fonts come from the style pack (pack.tsx), not from here.
  // Zones (px from the top)
  visualTop: 230,
  visualBottom: 1080,
  visualCenterY: 655,
  captionTop: 1130,
  brandY: 1560,
  // Content width – ~85 % of the frame
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
