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
