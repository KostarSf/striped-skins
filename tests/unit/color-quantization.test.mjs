import { test } from "node:test";
import assert from "node:assert/strict";
import {
  colorLevels,
  normalizeColorLevels,
  quantizeColor,
} from "../../app/components/studio/color-quantization.ts";

test("color limits accept only supported settings and default to unlimited", () => {
  for (const level of colorLevels) assert.equal(normalizeColorLevels(level), level);
  for (const value of [null, undefined, "4", 0, 1, 3, -4, 512, NaN, Infinity])
    assert.equal(normalizeColorLevels(value), 256);
  assert.equal(quantizeColor("#ABCDEF", 256), "#abcdef");
  assert.equal(quantizeColor("#123456", 3), "#123456");
  assert.deepEqual(colorLevels, [2, 4, 8, 16, 256]);
  assert.equal(normalizeColorLevels(32), 16);
  assert.equal(quantizeColor("#123456", 32), quantizeColor("#123456", 16));
});

test("RGB bins include both endpoints and match discrete spectrum boundaries", () => {
  assert.equal(quantizeColor("#3f407f", 4), "#005555");
  assert.equal(quantizeColor("#80bfc0", 4), "#aaaaff");
  assert.equal(quantizeColor("#7f80ff", 2), "#00ffff");
  for (const levels of colorLevels.slice(0, -1)) {
    const colors = new Set();
    for (let channel = 0; channel <= 255; channel++) {
      const hex = channel.toString(16).padStart(2, "0");
      const color = quantizeColor(`#${hex}${hex}${hex}`, levels);
      assert.match(color, /^#[\da-f]{6}$/);
      assert.equal(quantizeColor(color, levels), color);
      colors.add(color);
    }
    assert.equal(colors.size, levels);
    assert.ok(colors.has("#000000"));
    assert.ok(colors.has("#ffffff"));
  }
});
