import { type TimelinePreview } from "./visualTimelinePreview";

type ClipPreviewProps = {
  preview: TimelinePreview;
};

export function ClipPreview({ preview }: ClipPreviewProps) {
  return preview.video ? (
    <video
      src={preview.src}
      muted
      playsInline
      preload="auto"
      className="absolute inset-0 w-full h-full object-cover opacity-[0.34] pointer-events-none"
    />
  ) : (
    <div
      className="absolute inset-0 w-full h-full object-cover opacity-[0.34] pointer-events-none [background-repeat:repeat-x] [background-size:auto_100%]"
      style={{
        backgroundImage: preview.src
          ? `url(${JSON.stringify(preview.src)})`
          : undefined,
      }}
    />
  );
}
