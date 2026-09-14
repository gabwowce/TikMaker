export function formatTimecode(frames: number, fps: number): string {
  const total = Math.max(0, frames) / fps;
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  const milliseconds = Math.round((total - Math.floor(total)) * 1000);
  if (milliseconds === 1000)
    return formatTimecode(Math.round((Math.floor(total) + 1) * fps), fps);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}
export function formatDuration(frames: number, fps: number): string {
  return `${(Math.max(0, frames) / fps).toFixed(3)}s`;
}
export function framesToSeconds(frames: number, fps: number): number {
  return Number((frames / fps).toFixed(3));
}
export function frameStep(fps: number): number {
  return Number((1 / fps).toFixed(4));
}
