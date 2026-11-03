import { Easing } from "remotion";
export const standardEasing = Easing.bezier(0.16, 1, 0.3, 1);
export const exitEasing = Easing.bezier(0.7, 0, 0.84, 0);
export const pathEasing = Easing.bezier(0.45, 0, 0.55, 1);

// Spyruoklės „stage“ blokams (docs/motion-stilius.md, 2 skyrius).
// Kuo mažesnis damping, tuo labiau elementas „perlekia“ ir grįžta atgal.
// bouncy – aiškus atšokimas (~12 %), elementams, kurie didėja (scale);
// settle – vos juntamas atšokimas (~3 %), elementams, kurie atvažiuoja iš toli.
export const springs = {
  bouncy: { damping: 12, stiffness: 200, mass: 0.6 },
  settle: { damping: 17, stiffness: 200, mass: 0.6 },
};
