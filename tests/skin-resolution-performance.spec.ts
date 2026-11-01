import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

const counters = (page: Page) =>
  page.evaluate(() => {
    const value = Reflect.get(window, "resolutionPerformance");
    return {
      contexts: value.contexts.size,
      textures: value.textures.size,
      uploads: value.uploads,
      canvasWrites: value.canvasWrites,
      bufferWrites: value.bufferWrites,
      snapshots: value.snapshots,
    };
  });

const savedCamera = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string | undefined>((resolve, reject) => {
        const request = indexedDB.open("striped.editor", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("documents", "readonly");
          const value = tx.objectStore("documents").get("session");
          tx.oncomplete = () => {
            resolve(JSON.stringify(value.result?.first?.document.workspace.cameraState));
            db.close();
          };
          tx.onabort = () => {
            reject(tx.error);
            db.close();
          };
        };
      }),
  );

test("large resizes retain one WebGL context; orbit/pan autosaves reuse pixels without uploads or buffer writes", async ({
  page,
}) => {
  test.setTimeout(120_000);
  page.on("dialog", (dialog) => void dialog.accept());
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("viewer.options.animations", "");
    localStorage.setItem("viewer.options.smoothCamera", "");
    localStorage.setItem("viewer.options.antialiasing", "");
    localStorage.setItem("viewer.options.groundGrid", "");
    const stats = {
      contexts: new Set<RenderingContext>(),
      textures: new Set<WebGLTexture>(),
      uploads: 0,
      canvasWrites: 0,
      bufferWrites: 0,
      snapshots: 0,
    };
    Reflect.set(window, "resolutionPerformance", stats);
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, options) {
      const context = getContext.call(this, type, options);
      if (context && type.startsWith("webgl")) stats.contexts.add(context);
      return context;
    } as typeof getContext;
    for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const createTexture = prototype.createTexture,
        deleteTexture = prototype.deleteTexture;
      prototype.createTexture = function () {
        const texture = createTexture.call(this);
        if (texture) stats.textures.add(texture);
        return texture;
      };
      prototype.deleteTexture = function (texture) {
        if (texture) stats.textures.delete(texture);
        return deleteTexture.call(this, texture);
      };
      for (const method of ["texImage2D", "texSubImage2D"] as const) {
        const original = prototype[method];
        Reflect.set(prototype, method, function (this: WebGLRenderingContext, ...args: unknown[]) {
          stats.uploads++;
          return Reflect.apply(original, this, args);
        });
      }
    }
    const putImageData = CanvasRenderingContext2D.prototype.putImageData;
    Reflect.set(
      CanvasRenderingContext2D.prototype,
      "putImageData",
      function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        if (args[0] instanceof ImageData && args[0].width >= 1024) stats.canvasWrites++;
        return Reflect.apply(putImageData, this, args);
      },
    );
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
      if (args[0] instanceof Uint8ClampedArray && args[0].byteLength >= 65536) stats.bufferWrites++;
      return Reflect.apply(put, this, args);
    };
    const clone = window.structuredClone;
    window.structuredClone = ((...args: Parameters<typeof clone>) => {
      const value = args[0];
      if (
        value &&
        typeof value === "object" &&
        "pixels" in value &&
        value.pixels instanceof Uint8ClampedArray &&
        value.pixels.byteLength >= 4 * 1024 * 1024
      )
        stats.snapshots++;
      return Reflect.apply(clone, window, args);
    }) as typeof clone;
  });
  await page.goto("/editor");
  await page.getByRole("tab", { name: "Параметры скина", exact: true }).click();
  const resolution = page.getByLabel("Разрешение скина", { exact: true });
  await resolution.selectOption("1024");
  await expect(page.locator(".skin-parameters-workspace canvas")).toBeVisible();
  await expect(page.getByTestId("autosave-status")).toHaveCount(0);
  await page.evaluate(() =>
    Reflect.set(
      window,
      "resolutionCanvas",
      document.querySelector(".skin-parameters-workspace canvas"),
    ),
  );
  const baseline = await counters(page);
  for (const size of [2048, 4096, 1024, 4096, 2048, 4096]) {
    await resolution.selectOption(String(size));
    await expect(page.getByTestId("document-status")).toContainText(`${size} × ${size}`);
    await expect(page.getByTestId("autosave-status")).toHaveCount(0);
    expect(
      await page.evaluate(
        () =>
          Reflect.get(window, "resolutionCanvas") ===
          document.querySelector(".skin-parameters-workspace canvas"),
      ),
    ).toBe(true);
    const current = await counters(page);
    expect(current.contexts).toBe(baseline.contexts);
    expect(current.textures).toBe(baseline.textures);
  }
  const ready = await counters(page);
  let camera = await savedCamera(page);
  const canvas = page.locator(".skin-parameters-workspace canvas");
  const box = (await canvas.boundingBox())!;
  for (const button of ["left", "right"] as const) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down({ button });
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.56, { steps: 10 });
    await page.mouse.up({ button });
    await expect.poll(() => savedCamera(page)).not.toBe(camera);
    await expect(page.getByTestId("autosave-status")).toHaveCount(0);
    camera = await savedCamera(page);
    expect(await counters(page)).toEqual(ready);
  }
  await page.reload();
  await expect(page.getByLabel("Разрешение скина", { exact: true })).toHaveValue("4096");
  expect(await savedCamera(page)).toBe(camera);
  expect(errors).toEqual([]);
});
