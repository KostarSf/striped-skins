import { test } from "node:test";
import assert from "node:assert/strict";
import { createInstance } from "i18next";
import { detectLocale } from "../../app/i18n/locale.ts";
import { documentLabel } from "../../app/i18n/document-labels.ts";
import en from "../../app/i18n/en.ts";
import ru from "../../app/i18n/ru.ts";
import {
  SkinDocument,
  SkinError,
  normalizeSkinPixels,
} from "../../packages/api/build/esm/index.js";

test("locale negotiation preserves browser preference, weights and regional fallbacks", () => {
  for (const [header, locale] of [
    [null, "en"],
    ["", "en"],
    ["ru-RU,ru;q=0.9,en;q=0.8", "ru"],
    ["en-GB,ru;q=0.8", "en"],
    ["de-DE,ru-RU;q=0.8,en;q=0.7", "ru"],
    ["ru;q=0.2,en-US;q=0.9", "en"],
    ["ru;q=0,en;q=0.5", "en"],
    ["ru;q=oops,en", "en"],
    ["ru;q=1.1,en", "en"],
    ["EN-us;q=0.5,RU-ru;q=0.8", "ru"],
    ["garbage_!,ru", "ru"],
    ["fr-FR,*;q=0.5", "en"],
  ])
    assert.equal(detectLocale(header), locale, String(header));
});

test("catalogs contain the same keys and named interpolation parameters", () => {
  assert.deepEqual(Object.keys(ru).sort(), Object.keys(en).sort());
  const parameters = (message) =>
    [...message.matchAll(/{{\s*([^}]+)\s*}}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(en)) {
    assert.ok(en[key].length > 0 && ru[key].length > 0, key);
    assert.deepEqual(parameters(ru[key]), parameters(en[key]), key);
  }
});

test("document operation codes and legacy labels translate without changing custom names", async () => {
  const instance = createInstance();
  await instance.init({
    lng: "en",
    keySeparator: false,
    resources: { en: { translation: en }, ru: { translation: ru } },
  });
  assert.equal(documentLabel(instance.t, "history.stroke"), "Stroke");
  assert.equal(documentLabel(instance.t, "Создание слоя"), "Create layer");
  assert.equal(documentLabel(instance.t, "My custom operation"), "My custom operation");
  const doc = new SkinDocument(64, 64, new Uint8ClampedArray(64 * 64 * 4), "modern", "Base");
  doc.addLayer("layer", undefined, "My layer");
  const restored = SkinDocument.restore(doc.snapshot());
  await instance.changeLanguage("ru");
  assert.equal(documentLabel(instance.t, restored.undoLabel), "Создание слоя");
  assert.equal(restored.activeLayer.name, "My layer");
  assert.equal(restored.layers[0].name, "Base");
});

test("image validation exposes a stable error code", () => {
  assert.throws(
    () => normalizeSkinPixels(32, 32, []),
    (error) => error instanceof SkinError && error.code === "invalidDimensions",
  );
});
