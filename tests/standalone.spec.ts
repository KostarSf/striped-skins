import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

test("standalone viewer composes a registered pose and a finite clip, then returns to idle", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const dir = "packages/browser-bundle/dist/assets";
  const entry = readdirSync(dir).find((file) => file.endsWith(".js"))!;
  await page.route("**/__standalone-bundle.js", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: readFileSync(join(dir, entry), "utf8"),
    }),
  );
  await page.route("**/__standalone-test", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: `<html><body style="margin:0"><div id="viewer" style="width:100vw;height:100vh"></div><script type="module">
    import '/__standalone-bundle.js';
    window.framesDrawn=0;
    const draw=WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements=function(...args){window.framesDrawn++;return draw.apply(this,args)};
    window.viewer=new window.StripedViewer({targetElement:'#viewer',viewerOptions:{defaultSkinUrl:'/steve_pony.png',userOptions:{animations:false,smoothCamera:false}}});
    window.viewer.attach();
  </script></body></html>`,
    }),
  );
  await page.goto("/__standalone-test");
  await expect(page.locator("canvas")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean((window as any).viewer?.pony.firstPony.skin.source.hasImage)),
    )
    .toBe(true);
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const w = window as any;
    w.removePose = w.StripedViewer.registerPose("test-seated", {
      id: "test-seated",
      sample: () => ({ head: { rotation: [0.3, 0, 0] } }),
    });
    w.viewer.pony.firstPony.setPreview({ pose: "test-seated" });
    w.samples = [];
    w.viewer.pony.firstPony.setMotionLayers([
      {
        id: "hoof",
        duration: 0.2,
        sample: ({ time }: { time: number }) => {
          w.samples.push(time);
          return {
            right_arm: { rotation: [time * 3, 0, 0] },
            "not-on-this-race": { rotation: [1, 0, 0] },
          };
        },
      },
    ]);
  });
  await expect.poll(() => page.evaluate(() => Math.max(...(window as any).samples))).toBe(0.2);
  expect(
    await page.evaluate(() =>
      (window as any).samples.some((time: number) => time > 0 && time < 0.2),
    ),
  ).toBe(true);
  await page.waitForTimeout(300);
  const draws = await page.evaluate(() => (window as any).framesDrawn);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as any).framesDrawn)).toBe(draws);
  await page.evaluate(() => {
    const w = window as any;
    w.viewer.pony.firstPony.setMotionLayers([]);
    w.viewer.pony.firstPony.setPreview({ pose: "standing" });
    w.removePose();
    w.viewer.detach();
  });
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});
