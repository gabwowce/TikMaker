import type { VideoProject } from "../schema/project";

/**
 * The built-in templates are imported from `src/templates/`, NOT from
 * `projects/`.
 *
 * They used to be ordinary entries in the video library, which meant the app
 * would not COMPILE once you deleted one from the library — and deleting a
 * video you are done with is a completely reasonable thing to do. A built-in
 * template is code that ships with the editor; your library is data you own.
 * Keeping them in separate folders is what makes those two facts independent.
 */
import { parseProject } from "../utils/normalizeProject";
import problemPayoffJson from "../templates/template-problem-payoff.json";
import mythbustJson from "../templates/template-mythbust.json";
import beforeAfterJson from "../templates/template-before-after.json";
import curiosityLoopJson from "../templates/template-curiosity-loop.json";
import vibeCodingRoadmapJson from "../templates/vibe-coding-mvp-roadmap.json";
import directionDemoJson from "../templates/template-direction-demo.json";
import claudeCodeWorkflowJson from "../templates/claude-code-workflow.json";
import devVisualsJson from "../templates/template-dev-visuals.json";
import shortcutsJson from "../templates/claude-code-shortcuts.json";
import shortcuts4Json from "../templates/claude-code-shortcuts-4.json";
import visualCarryJson from "../templates/template-visual-carry.json";

export type ScriptTemplate = {
  id: string;
  name: string;
  description: string;
  /** Short labels for each scene, shown as a flow strip in the picker. */
  flow: string[];
  project: VideoProject;
};

export const scriptTemplateRegistry: ScriptTemplate[] = [
  {
    id: "template-problem-payoff",
    name: "Problem → Payoff",
    description:
      "Klasikinis edukacinis/tech ritmas: skausmas, sprendimas, 4 animuoti žingsniai (kiekvienas — savo kadrų pora), CTA.",
    flow: ["Hook", "Skausmas", "Sprendimas", "Žingsnis 01", "Žingsnis 02", "Žingsnis 03", "Žingsnis 04", "CTA"],
    project: parseProject(problemPayoffJson),
  },
  {
    id: "template-mythbust",
    name: "Myth-bust",
    description: "Sulaužai klaidingą įsitikinimą — stiprus pattern-interrupt kablys pirmoms 3s.",
    flow: ["Hook", "Mitas vs realybė", "Kodėl", "CTA"],
    project: parseProject(mythbustJson),
  },
  {
    id: "template-before-after",
    name: "Before / After",
    description: "Vizualus kontrastas — kaip buvo prieš, kaip yra dabar, kaip tai pasiekti.",
    flow: ["Prieš", "Prieš/Po", "Kaip", "CTA"],
    project: parseProject(beforeAfterJson),
  },
  {
    id: "template-curiosity-loop",
    name: "Curiosity Loop",
    description:
      "Intriguojantis skaičius kaip kablys, kontekstas, tada 3 animuoti žingsniai kaip tuo pasinaudoti.",
    flow: ["Skaičius", "Kontekstas", "Žingsnis 01", "Žingsnis 02", "Žingsnis 03", "CTA"],
    project: parseProject(curiosityLoopJson),
  },
  {
    id: "vibe-coding-mvp-roadmap",
    name: "Pavyzdys: Vibe Coding Roadmap",
    description:
      "Pilnai užpildytas pavyzdys — kaip pasidaryti pirmą app'ą nemokant programuoti: įrankiai, promptas, API, raktų saugojimas, paleidimas.",
    flow: [
      "Hook",
      "Skausmas",
      "5 žingsniai",
      "01 Įrankis",
      "02 Idėja",
      "03 API",
      "04 Raktai",
      "05 Deploy",
      "CTA",
    ],
    project: parseProject(vibeCodingRoadmapJson),
  },
  {
    id: "template-direction-demo",
    name: "Patikra: Kryptys ir glaistymas",
    description:
      "Ne tikras video — kiekvienas kadras tekste PASAKO, iš kur turėtų atslinkti (SLIDELEFT/RIGHT/UP/DOWN), o paskutinė pora parodo tą pačią ikoną, kuri padidėja/sumažėja tarp dviejų kadrų. Naudok patikrinti, ar perėjimai veikia teisingai.",
    flow: ["Intro", "→ Dešinė", "→ Viršus", "→ Kairė", "→ Apačia", "Didelė ikona", "Maža ikona", "Pabaiga"],
    project: parseProject(directionDemoJson),
  },
  {
    id: "claude-code-workflow",
    name: "Stop Writing Better Prompts",
    description:
      "Claude Code workflow video: rules, plan-first, and how to rewind — from your own script draft.",
    flow: [
      "Hook",
      "Reframe",
      "01 Rules",
      "01 CLAUDE.md",
      "02 Plan first",
      "02 Approve",
      "03 Go back",
      "03 ESC",
      "03 Rewind",
      "Payoff / CTA",
    ],
    project: parseProject(claudeCodeWorkflowJson),
  },
  {
    id: "template-visual-carry",
    name: "Patikra: Vizualo perkėlimas",
    description:
      "Vienas vizualas keliauja per tris kadrus keisdamas tik poziciją ir dydį — `visualLink` pavyzdys JSON'e.",
    flow: ["Intro", "01 Didelis", "02 Mažas", "03 Kampe"],
    project: parseProject(visualCarryJson),
  },
  {
    id: "template-dev-visuals",
    name: "Patikra: Dev vizualai",
    description:
      "Ne video — po vieną kadrą kiekvienam dev vizualui (diff, terminalas, klavišai). Naudok patikrinti, ar tekstas telpa ir nieko nenukerpa.",
    flow: ["Diff", "Terminalas", "Klavišas", "Kombinacija"],
    project: parseProject(devVisualsJson),
  },
  {
    id: "claude-code-shortcuts",
    name: "Claude Code Shortcuts",
    description:
      "Trys Claude Code klavišai, kiekvienas per skausmas → sprendimas porą: kas negerai, kurį klavišą spaudi ir ką realiai pamatai.",
    flow: [
      "Hook",
      "01 Problema",
      "01 Esc Esc",
      "02 Problema",
      "02 Shift Tab",
      "03 Problema",
      "03 Ctrl R",
      "CTA",
    ],
    project: parseProject(shortcutsJson),
  },
  {
    id: "claude-code-shortcuts-4",
    name: "4 Claude Code Shortcuts",
    description:
      "Keturi klaviatūros trumpiniai iš dokumentacijos: kiekvienas — savo #N kortelė su klavišo ikona (keycap), kuri per `link` glide'ina į aiškinimo kadrą su tuo pačiu klavišu, didesnis ir kampe. Corner-floating Claude logotipai apgaubia hook/CTA.",
    flow: [
      "Hook",
      "#1 Shift+Tab",
      "01 Aiškinimas",
      "#2 Esc",
      "02 Aiškinimas",
      "#3 Esc Esc",
      "03 Aiškinimas",
      "#4 Ctrl+C",
      "04 Aiškinimas",
      "CTA",
    ],
    project: parseProject(shortcuts4Json),
  },
];

export function getScriptTemplate(id: string): ScriptTemplate | undefined {
  return scriptTemplateRegistry.find((t) => t.id === id);
}
