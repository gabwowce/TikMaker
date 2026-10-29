import { assetUrl } from "./assetUrl";

// The real size of a picture in px, read by loading it in the browser.
export function readImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error(`Cannot load image ${src}`));
    image.src = assetUrl(src);
  });
}

// The same for a video clip, from its metadata only.
export function readVideoSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      video.videoWidth && video.videoHeight
        ? resolve({ width: video.videoWidth, height: video.videoHeight })
        : reject(new Error(`No size in ${src}`));
    video.onerror = () => reject(new Error(`Cannot load video ${src}`));
    video.src = assetUrl(src);
  });
}
