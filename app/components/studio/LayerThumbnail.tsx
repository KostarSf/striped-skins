import { memo, useEffect, useRef } from "react";

/** Mutable pixels: revision commits at stroke end so live painting skips thumbnail renders. */
export const LayerThumbnail = memo(function LayerThumbnail({
  pixels,
  width,
  height,
  revision,
}: {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  revision: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvas.current,
      context = target?.getContext("2d");
    if (!target || !context) return;
    context.clearRect(0, 0, 32, 32);
    let minX = width,
      minY = height,
      maxX = -1,
      maxY = -1;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        if (!pixels[(y * width + x) * 4 + 3]) continue;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    const empty = maxX < 0;
    target.dataset.empty = String(empty);
    target.dataset.bounds = empty ? "" : `${minX},${minY},${maxX - minX + 1},${maxY - minY + 1}`;
    if (empty) return;
    const cropWidth = maxX - minX + 1,
      cropHeight = maxY - minY + 1;
    const cropped = new Uint8ClampedArray(cropWidth * cropHeight * 4);
    for (let y = 0; y < cropHeight; y++)
      cropped.set(
        pixels.subarray(((y + minY) * width + minX) * 4, ((y + minY) * width + maxX + 1) * 4),
        y * cropWidth * 4,
      );
    const source = document.createElement("canvas");
    source.width = cropWidth;
    source.height = cropHeight;
    source.getContext("2d")!.putImageData(new ImageData(cropped, cropWidth, cropHeight), 0, 0);
    const scale = Math.min(32 / cropWidth, 32 / cropHeight);
    const displayWidth = Math.max(1, Math.round(cropWidth * scale)),
      displayHeight = Math.max(1, Math.round(cropHeight * scale));
    context.imageSmoothingEnabled = false;
    context.drawImage(
      source,
      Math.floor((32 - displayWidth) / 2),
      Math.floor((32 - displayHeight) / 2),
      displayWidth,
      displayHeight,
    );
  }, [pixels, width, height, revision]);
  return (
    <canvas
      ref={canvas}
      width={32}
      height={32}
      className="layer-thumbnail"
      data-testid="layer-thumbnail"
      aria-hidden="true"
    />
  );
});
