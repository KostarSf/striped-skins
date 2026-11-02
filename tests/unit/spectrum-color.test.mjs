import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hexToHsv,
  hueSteps,
  hsvToHex,
  spectrumColor,
  spectrumSample,
} from "../../app/components/studio/spectrum-color.ts";

test("HSV round-trips exact RGB colors, retaining undefined hue and saturation", () => {
  for (let r = 0; r <= 255; r += 17) {
    for (let g = 0; g <= 255; g += 17) {
      for (let b = 0; b <= 255; b += 17) {
        const hex = "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
        assert.equal(hsvToHex(hexToHsv(hex)), hex);
      }
    }
  }
  const green = { h: 120, s: 80, v: 70 };
  assert.deepEqual(hexToHsv("#000000", green), { h: 120, s: 80, v: 0 });
  const gray = hexToHsv("#808080", green);
  assert.equal(gray.h, 120);
  assert.equal(gray.s, 0);
  assert.equal(hexToHsv("#0000ff", green).h, 240);
});

test("spectrum cells have constant colors throughout each rectangle and keep the RGB palette", () => {
  for (const levels of [2, 4, 8, 16, 32]) {
    const channels = new Set(
      Array.from({ length: levels }, (_, i) => Math.round((i * 255) / (levels - 1))),
    );
    for (const h of [0, 37, 120, 222, 300, 360]) {
      for (let x = 0; x < levels; x++) {
        for (let y = 0; y < levels; y++) {
          const colors = [0.01, 0.5, 0.99].map((offset) =>
            spectrumColor(
              { h, s: ((x + offset) * 100) / levels, v: ((y + offset) * 100) / levels },
              levels,
            ),
          );
          assert.equal(colors[0], colors[1]);
          assert.equal(colors[1], colors[2]);
          for (const offset of [1, 3, 5])
            assert.ok(channels.has(parseInt(colors[0].slice(offset, offset + 2), 16)));
        }
      }
    }
  }
  const precise = { h: 127.5, s: 42.1, v: 73.9 };
  assert.deepEqual(spectrumSample(precise, 256), precise);
  assert.equal(spectrumColor(precise, 256), hsvToHex(precise));
  assert.equal(spectrumColor({ h: 120, s: 0, v: 100 }, 8), "#ffffff");
  assert.equal(spectrumColor({ h: 120, s: 100, v: 0 }, 8), "#000000");
});

test("the rectangular spectrum can still select every color in each limited RGB palette", () => {
  for (const levels of [2, 4, 8, 16, 32]) {
    const colors = new Set();
    const hues = hueSteps(levels);
    for (let h = 0; h < hues; h++) {
      for (let s = 0; s < levels; s++) {
        for (let v = 0; v < levels; v++) {
          colors.add(
            spectrumColor(
              {
                h: (h * 360) / (hues - 1),
                s: (s * 100) / (levels - 1),
                v: (v * 100) / (levels - 1),
              },
              levels,
            ),
          );
        }
      }
    }
    assert.equal(colors.size, levels ** 3);
  }
});
