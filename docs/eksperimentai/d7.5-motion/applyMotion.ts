// Was at the end of src/agent/compileProject.ts

// The model's motion plan on top of the laid-out scenes: how each scene is
// entered, how its text and pictures arrive and what keeps them alive, which
// word stands out, and sound only where the plan puts one – every other cue
// is switched off, so nothing plays by default.
export function applyMotion(
  project: VideoProject,
  run: AgentRun,
  motion: MotionFromAi,
): VideoProject {
  const scenes = project.scenes.map((scene) => {
    const plan = motion.scenes.find(
      (_, n) => scene.id === `scene-${run.id}-${n + 1}`,
    );
    if (!plan) return scene;
    const sound = (on: "cut" | "text" | "visual") =>
      plan.sound?.on === on ? SOUNDS[plan.sound.type] : "none";
    const highlight = plan.highlight?.toLowerCase();
    return {
      ...scene,
      motion: {
        ...scene.motion,
        transition: plan.transition,
        // The content rides the scene's own move; text and pictures carry
        // their own entrances below.
        entrance: "none",
        sfx: sound("cut"),
        exitSfx: "none",
      },
      content: {
        ...scene.content,
        richHeadline: scene.content.richHeadline?.map((line, index) => ({
          ...line,
          animation: plan.textIn,
          splitBy: plan.textSplit,
          highlights: line.text
            .split(/\s+/)
            .filter(
              (word) => highlight && word.toLowerCase().includes(highlight),
            ),
          sfx: index === 0 ? sound("text") : "none",
        })),
        visuals: scene.content.visuals?.map((layer, index) => ({
          ...layer,
          entrance: plan.visualIn,
          kenBurns: plan.visualAlive === "none" ? undefined : plan.visualAlive,
          sfx: index === 0 ? sound("visual") : "none",
          exitSfx: "none",
        })),
      },
    } satisfies Scene;
  });
  return { ...project, scenes };
}
