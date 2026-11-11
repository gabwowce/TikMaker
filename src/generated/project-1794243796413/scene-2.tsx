import { z } from "zod";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { SCENE_COLORS, asset, field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  ASSETS,
  Backdrop,
  BrowserCard,
  CAT_RECORD,
  Camera,
  CatScreen,
  CreatorChip,
  Headline,
  Motif,
  Swap,
  cardMotion,
  focusAt,
  usePop,
  words as w,
} from "./shared";

export const description =
  "The catcopter.com card keeps playing; 'Built with AI this week #1' turns into 'Catcopter' with a Claude Opus sticker, and a pterodactyl, a chicken and a penguin pop in next to the creator's name";

export const schema = z.object({
  gameplay: field.recording("Catcopter gameplay (continues from scene 1)", CAT_RECORD),
  series: field.text("Series title", "Built with AI"),
  seriesSub: field.text("Series line 2", "this week #1"),
  title: field.text("Project title", "*Catcopter*"),
  creator: field.text("Creator", "pawelwentpawel"),
  url: field.text("Link", "catcopter.com"),
  titleOn: field.word("Title appears on", "With"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.teal;

function Sticker({ at, emoji }: { at: number; emoji: string }) {
  const pop = usePop(at);
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: 84,
        height: 84,
        borderRadius: 42,
        background: "rgba(255,255,255,0.12)",
        border: "1.5px solid rgba(255,255,255,0.2)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 50,
        opacity: pop.opacity,
        transform: `scale(${pop.scale}) rotate(${Math.sin((frame + at) / 12) * 6}deg)`,
      }}
    >
      {emoji}
    </div>
  );
}

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const titleAt = wordFrame(words, params.titleOn, 86);
  const claude = wordFrame(words, "Claude", titleAt + 6);
  const game = wordFrame(words, "game", 161);
  const cat = wordFrame(words, "cat", 193);
  const ptero = wordFrame(words, "pterodactyls", 210);
  const chick = wordFrame(words, "chickens", 239);
  const peng = wordFrame(words, "penguins", 269);
  const focus = focusAt(frame, [
    [0, { cx: 490, cy: 250, s: 0.82 }],
    [game - 10, { cx: 1290, cy: 330, s: 0.62 }],
    [cat, { cx: 1290, cy: 680, s: 0.7 }],
    [chick, { cx: 1400, cy: 340, s: 0.95 }],
    [durationInFrames, { cx: 1280, cy: 700, s: 0.6 }],
  ]);
  const sticker = usePop(claude);

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} y={660} fromY={640} />
      <Motif src={ASSETS.catcopter.src} rotate={6} />
      <Camera duration={durationInFrames} punchAt={[titleAt]}>
        <Swap to={titleAt - 3}>
          <Headline
            lines={[w(params.series, 0, 4), w(params.seriesSub, 12, 4)]}
            size={92}
            top={235}
            color={COLOR}
          />
        </Swap>
        <Swap from={titleAt}>
          <Headline lines={[w(params.title, titleAt - 2)]} size={110} top={255} color={COLOR} />
        </Swap>
        <div style={{ position: "absolute", left: 130, top: 420, ...cardMotion(frame, -40) }}>
          <BrowserCard url={params.url} bodyHeight={470} glow={COLOR}>
            <CatScreen src={params.gameplay} at={-133} width={770} height={470} focus={focus} />
          </BrowserCard>
          {/* the tool that built it – a sticker on the card's corner */}
          <div
            style={{
              position: "absolute",
              right: -10,
              top: -36,
              height: 72,
              padding: "0 26px 0 16px",
              borderRadius: 36,
              background: "#ffffff",
              boxShadow: `0 10px 30px rgba(0,0,0,0.4), 0 0 40px ${COLOR}66`,
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: sticker.opacity,
              transform: `scale(${sticker.scale}) rotate(4deg)`,
            }}
          >
            <Img src={asset(ASSETS.claude)} style={{ width: 40, height: 40 }} />
            <span style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 30, color: "#1b1d22" }}>Claude Opus</span>
          </div>
        </div>
        <CreatorChip name={params.creator} top={1002} color={COLOR} align="left" />
        <div style={{ position: "absolute", left: 590, top: 998, width: 310, display: "flex", justifyContent: "flex-end", gap: 24 }}>
          <Sticker at={ptero} emoji="🦖" />
          <Sticker at={chick} emoji="🐔" />
          <Sticker at={peng} emoji="🐧" />
        </div>
      </Camera>
    </AbsoluteFill>
  );
}
