import { test } from "node:test";
import assert from "node:assert/strict";
import { initialAntialiasing } from "../../app/antialiasing.ts";
import { normalizeAntialiasing } from "../../packages/viewer/build/esm/antialiasing.js";

test("phone UA defaults to MSAA; desktop and tablet UA default to SMAA", () => {
  for (const ua of ["iPhone OS 18", "Android 15; Pixel 9) Chrome Mobile", "Windows Phone"])
    assert.equal(initialAntialiasing(null, ua), "msaa");
  for (const ua of ["X11; Linux x86_64", "Windows NT 10.0", "iPad OS 18", "Android 15; Tablet"])
    assert.equal(initialAntialiasing(null, ua), "smaa");
});

test("saved AA mode wins over UA; old disabled/enabled preferences migrate", () => {
  for (const mode of ["off", "msaa", "smaa"])
    for (const ua of ["iPhone OS 18", "X11; Linux x86_64"])
      assert.equal(initialAntialiasing(mode, ua), mode);
  assert.equal(initialAntialiasing("", "iPhone OS 18"), "off");
  assert.equal(initialAntialiasing("on", "iPhone OS 18"), "msaa");
  assert.equal(initialAntialiasing("on", "X11; Linux x86_64"), "smaa");
  assert.equal(initialAntialiasing("invalid", "iPhone OS 18"), "msaa");
});

test("standalone accepts explicit modes and retains the original boolean API", () => {
  for (const mode of ["off", "msaa", "smaa"]) assert.equal(normalizeAntialiasing(mode), mode);
  assert.equal(normalizeAntialiasing(true), "smaa");
  assert.equal(normalizeAntialiasing(false), "off");
  assert.equal(normalizeAntialiasing(undefined, "msaa"), "msaa");
});
