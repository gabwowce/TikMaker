// The experiment (branch experiment/code-video): every scene's picture is
// written as Remotion code by Claude Code, following the channel's style
// skill (.claude/skills/motion-video/SKILL.md), instead of being picked from
// the block library. The voice, the captions and the backdrop stay ours, so
// only the pictures are compared.

// One spoken word of the scene, in frames from the scene's own start.
export type SceneWord = { text: string; frame: number; endFrame: number };

// What every generated scene gets. It draws ONLY the picture: the backdrop is
// already there, and the captions are drawn over it in the bottom band
// (y 1130–1340 px on a 1080x1920 frame) – keep the picture above y 1080.
export type SceneProps = {
  index: number; // scene number from 0
  durationInFrames: number;
  voiceover: string;
  words: SceneWord[];
};
