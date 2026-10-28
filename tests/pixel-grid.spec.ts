import { expect, test, type Page } from "@playwright/test";

async function gridAlignment(page: Page) {
  const area = page.locator(".texture-area");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const clip = (await area.boundingBox())!;
  const texture = (await page.getByTestId("skin-texture").boundingBox())!;
  // Use alternating texels to measure the browser's actual canvas raster,
  // including any compositor snapping of its fractional CSS position.
  await page.getByTestId("skin-texture").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("2d")!;
    const image = context.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y++)
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        image.data.fill((x + y) % 2 ? 255 : 0, index, index + 3);
        image.data[index + 3] = 255;
      }
    context.putImageData(image, 0, 0);
    document.body.dataset.gridProbe = "pixels";
  });
  const pixels = (await area.screenshot()).toString("base64");
  await page.evaluate(() => (document.body.dataset.gridProbe = "grid"));
  const lines = (await area.screenshot()).toString("base64");
  return page.evaluate(
    async ({ pixels, lines, clip, texture }) => {
      const decode = async (png: string) => {
        const bytes = Uint8Array.from(atob(png), (character) => character.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        return context.getImageData(0, 0, canvas.width, canvas.height);
      };
      const source = await decode(pixels);
      const grid = await decode(lines);
      const origin = {
        x: (texture.x - Math.floor(clip.x + 0.001)) * devicePixelRatio,
        y: (texture.y - Math.floor(clip.y + 0.001)) * devicePixelRatio,
      };
      const step = {
        x: (texture.width * devicePixelRatio) / 64,
        y: (texture.height * devicePixelRatio) / 64,
      };
      return (["x", "y"] as const).map((axis) => {
        const other = axis === "x" ? "y" : "x";
        const row = Math.round(origin[other] + step[other] / 2);
        const groups: number[][] = [];
        const edges: number[] = [];
        const length = axis === "x" ? grid.width : grid.height;
        let previous = false;
        for (let point = 0; point < length; point++) {
          const x = axis === "x" ? point : row;
          const y = axis === "x" ? row : point;
          const index = (y * grid.width + x) * 4;
          const white = source.data[index] > 127;
          if (point && white !== previous) edges.push(point);
          previous = white;
          if (grid.data[index] <= 8) continue;
          if (!groups.length || point > groups.at(-1)!.at(-1)! + 1) groups.push([]);
          groups.at(-1)!.push(point);
        }
        const internal = (point: number) =>
          point > origin[axis] + step[axis] / 2 && point < origin[axis] + step[axis] * 63.5;
        const centers = groups.map((group) => (group[0] + group.at(-1)! + 1) / 2).filter(internal);
        const boundaries = edges.filter(internal);
        const offsets = centers.map((center, i) => center - boundaries[i]);
        return {
          axis,
          count: centers.length,
          boundaries: boundaries.length,
          error: Math.max(...offsets.map(Math.abs)),
          drift: Math.max(
            ...centers.map((center, i) => Math.abs(center - centers[0] - i * step[axis])),
          ),
        };
      });
    },
    { pixels, lines, clip, texture },
  );
}

for (const deviceScaleFactor of [1, 3]) {
  test.describe(`pixel grid at device pixel ratio ${deviceScaleFactor}`, () => {
    test.use({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor,
    });
    test("every row and column follows the texture during fractional pinch zoom", async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.addInitScript(() => localStorage.setItem("viewer.options.animations", ""));
      await page.goto("/editor");
      await page.getByRole("button", { name: "2D вид", exact: true }).tap();
      await expect(page.locator(".studio-loading-badge")).toHaveCount(0);
      await page.getByTestId("skin-texture").screenshot();
      // Isolate the actual grid raster without changing its opacity or geometry.
      await page.addStyleTag({
        content:
          ".texture-area,.texture-atlas{background:#000!important;box-shadow:none!important}.texture-guides,.brush-cursor{opacity:0!important}[data-grid-probe=grid] .texture-atlas canvas,[data-grid-probe=pixels] .pixel-grid{opacity:0!important}",
      });
      const box = (await page.locator(".texture-area").boundingBox())!;
      const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      const fingers = (distance: number) => [
        { id: 1, x: center.x - distance / 2, y: center.y },
        { id: 2, x: center.x + distance / 2, y: center.y },
      ];
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: fingers(100),
      });
      for (const distance of [80.3, 89.7, 97.3, 100.1, 109.4, 117.8]) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: fingers(distance),
        });
        for (const result of await gridAlignment(page)) {
          expect(result.count, `${result.axis} lines at distance ${distance}`).toBe(63);
          expect(result.boundaries).toBe(63);
          // Pixelated canvas edges can snap by a CSS pixel. Grid spacing must
          // still follow texel coordinates within one physical pixel, with a
          // small allowance for CSS layout-unit rounding.
          expect(result.error, `${result.axis} drift at distance ${distance}`).toBeLessThanOrEqual(
            deviceScaleFactor + 0.5,
          );
          expect(result.drift).toBeLessThanOrEqual(1.05);
        }
      }
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
    });
  });
}
