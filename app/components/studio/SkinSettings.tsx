import {
  decodeSkinMetadata,
  writeSkinMetadata,
  wearableNames,
  type SkinDocument,
  type SkinMetadata,
  type RaceId,
} from "@striped-skins/api";
import { bodySizes, type PreviewSettings } from "@striped-skins/models";
import { useSyncExternalStore } from "react";
import { Field, Toggle } from "./ui";
export const raceNames: Record<RaceId, string> = {
  HUMAN: "Человек",
  EARTH: "Земная пони",
  PEGASUS: "Пегас",
  UNICORN: "Единорог",
  ALICORN: "Аликорн",
  CHANGELING: "Чейнджлинг",
  ZEBRA: "Зебра",
  CHANGEDLING: "Перевоплощённый чейнджлинг",
  GRYPHON: "Грифон",
  HIPPOGRIFF: "Гиппогриф",
  KIRIN: "Кирин",
  BATPONY: "Бэтпони",
  SEAPONY: "Морская пони",
};
const sizes = {
  NORMAL: "Стандартный",
  FOAL: "Жеребёнок",
  YEARLING: "Подросток",
  TALL: "Высокий",
  LANKY: "Вытянутый",
  BULKY: "Широкий",
};
export function SkinSettings({
  document,
  preview,
  onPreview,
  slim,
  onSlim,
}: {
  document: SkinDocument;
  preview: PreviewSettings;
  onPreview: (patch: Partial<PreviewSettings>) => void;
  slim?: boolean;
  onSlim?: (value: boolean) => void;
}) {
  useSyncExternalStore(document.subscribe, document.getSnapshot, document.getSnapshot);
  const meta = decodeSkinMetadata(document);
  const write = (patch: Partial<Omit<SkinMetadata, "slim">>) => writeSkinMetadata(document, patch);
  return (
    <div className="skin-settings">
      <div className="settings-group">
        <Field label="Раса">
          <select
            aria-label="Раса"
            value={meta.race}
            onChange={(e) => write({ race: e.target.value as RaceId })}
          >
            {Object.entries(raceNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Размер">
          <select
            aria-label="Размер модели"
            value={meta.size}
            onChange={(e) => write({ size: e.target.value as SkinMetadata["size"] })}
          >
            {bodySizes.map((id) => (
              <option key={id} value={id}>
                {sizes[id]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Цвет магии" hint="Цвет свечения и окраска рогов-аксессуаров">
          <div className="color-field">
            <input
              type="color"
              aria-label="Цвет свечения"
              value={`#${meta.glow}`}
              onChange={(e) => write({ glow: e.target.value.slice(1) })}
            />
            <span>#{meta.glow.toUpperCase()}</span>
          </div>
        </Field>
      </div>
      <fieldset className="settings-group">
        <legend>
          Аксессуары <span className="count-badge">{meta.wearables.length}/3</span>
        </legend>
        <p className="muted">Можно сочетать до трёх аксессуаров</p>
        <div className="accessory-options">
          {Object.entries(wearableNames).map(([id, name]) => (
            <label
              key={id}
              className="accessory-choice"
              data-selected={meta.wearables.includes(+id)}
            >
              <input
                type="checkbox"
                aria-label={name}
                checked={meta.wearables.includes(+id)}
                disabled={meta.wearables.length >= 3 && !meta.wearables.includes(+id)}
                onChange={(e) =>
                  write({
                    wearables: e.target.checked
                      ? [...meta.wearables, +id]
                      : meta.wearables.filter((v) => v !== +id),
                  })
                }
              />
              <span aria-hidden="true">{meta.wearables.includes(+id) ? "✓" : "＋"}</span>
              {name}
            </label>
          ))}
        </div>
      </fieldset>
      <details open className="settings-group">
        <summary>Морда и хвост</summary>
        <div className="settings-grid">
          <Field label="Морда">
            <select
              aria-label="Морда"
              value={meta.snout}
              onChange={(e) => write({ snout: e.target.value as SkinMetadata["snout"] })}
            >
              <option value="mare">Округлая</option>
              <option value="stallion">Квадратная</option>
              <option value="flat">Плоская</option>
            </select>
          </Field>
          <Field label="Форма хвоста">
            <select
              aria-label="Форма хвоста"
              value={meta.tailShape}
              onChange={(e) => write({ tailShape: e.target.value as SkinMetadata["tailShape"] })}
            >
              <option value="STRAIGHT">Прямой</option>
              <option value="BUMPY">Объёмный</option>
              <option value="SWIRLY">Волнистый</option>
              <option value="SPIKY">Остроконечный</option>
            </select>
          </Field>
        </div>
        <Field label={`Длина хвоста · ${meta.tailLength}/4`}>
          <input
            type="range"
            aria-label="Длина хвоста"
            min={0}
            max={4}
            value={meta.tailLength}
            onChange={(e) => write({ tailLength: +e.target.value })}
          />
        </Field>
      </details>
      <details open className="settings-group">
        <summary>Предпросмотр</summary>
        <p className="muted">Эти настройки не записываются в PNG</p>
        {onSlim ? <Toggle label="Slim" checked={slim ?? meta.slim} onChange={onSlim} /> : null}
        <Toggle
          label="Раскрыть крылья"
          checked={preview.wings === "extended"}
          onChange={(v) => onPreview({ wings: v ? "extended" : "folded" })}
        />
        {["SEAPONY", "HIPPOGRIFF"].includes(meta.race) ? (
          <Field label="Форма">
            <select
              aria-label="Форма"
              value={preview.form}
              onChange={(e) => onPreview({ form: e.target.value as PreviewSettings["form"] })}
            >
              <option value="skin">По скину</option>
              <option value="wet">Водная</option>
              <option value="dry">Сухопутная</option>
            </select>
          </Field>
        ) : null}
      </details>
      {document.sourceFormat === "legacy" ? (
        <p className="studio-notice">
          Legacy-скин преобразован в квадратный формат. PNG будет сохранён в новом формате.
        </p>
      ) : null}
    </div>
  );
}
