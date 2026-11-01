import { getWearableNames, getRaceNames, getSizeNames } from "../../i18n/model-labels";
import { useTranslation } from "react-i18next";
import {
  decodeSkinMetadata,
  writeSkinMetadata,
  type SkinDocument,
  type SkinMetadata,
  type RaceId,
  SKIN_RESOLUTIONS,
} from "@striped-skins/api";
import { bodySizes, type PreviewSettings } from "@striped-skins/models";
import { useState, useSyncExternalStore } from "react";
import { errorMessage } from "../../i18n/errors";
import { ColorPicker } from "./ColorPicker";
import { Field, Toggle } from "./ui";
export function SkinSettings({
  document,
  preview,
  onPreview,
  slim,
  onSlim,
  palette,
}: {
  document: SkinDocument;
  preview: PreviewSettings;
  onPreview: (patch: Partial<PreviewSettings>) => void;
  slim?: boolean;
  onSlim?: (value: boolean) => void;
  palette?: readonly string[];
}) {
  const { t } = useTranslation();
  const [resizeError, setResizeError] = useState("");
  const wearableNames = getWearableNames(t);
  const raceNames = getRaceNames(t);
  const sizes = getSizeNames(t);

  useSyncExternalStore(document.subscribe, document.getSnapshot, document.getSnapshot);
  const meta = decodeSkinMetadata(document);
  const write = (patch: Partial<Omit<SkinMetadata, "slim">>) => writeSkinMetadata(document, patch);
  return (
    <div className="skin-settings">
      <p className="skin-dimensions">
        <span>{t("skin.textureSize")}</span>
        <span>
          {document.width} × {document.height} px · PNG
        </span>
      </p>
      <div className="settings-group">
        <Field label={t("skin.resolution")}>
          <select
            aria-label={t("skin.resolution")}
            value={document.width}
            onChange={(event) => {
              try {
                document.resize(Number(event.target.value));
                setResizeError("");
              } catch (error) {
                setResizeError(errorMessage(t, error));
              }
            }}
          >
            {[...new Set([...SKIN_RESOLUTIONS, document.width])]
              .sort((a, b) => a - b)
              .map((size) => (
                <option key={size} value={size}>
                  {size} × {size} px
                </option>
              ))}
          </select>
          <small>{t("skin.resolutionHint")}</small>
        </Field>
        {resizeError ? (
          <p className="studio-error" role="alert">
            {resizeError}
          </p>
        ) : null}
        <Field label={t("skin.race")}>
          <select
            aria-label={t("skin.race")}
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
        <Field label={t("skin.size")}>
          <select
            aria-label={t("skin.modelSize")}
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
        <div className="studio-field">
          <span>{t("skin.magicColor")}</span>
          <div className="color-field">
            <ColorPicker
              palette={palette}
              label={t("skin.glowColor")}
              value={`#${meta.glow}`}
              onChange={(color) => write({ glow: color.slice(1) })}
            />
            <span>#{meta.glow.toUpperCase()}</span>
          </div>
          <small>{t("skin.glowHint")}</small>
        </div>
      </div>
      <fieldset className="settings-group">
        <legend>
          {t("skin.accessories")} <span className="count-badge">{meta.wearables.length}/3</span>
        </legend>
        <p className="muted">{t("skin.accessoriesHint")}</p>
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
        <summary>{t("skin.snoutAndTail")}</summary>
        <div className="settings-grid">
          <Field label={t("skin.snout")}>
            <select
              aria-label={t("skin.snout")}
              value={meta.snout}
              onChange={(e) => write({ snout: e.target.value as SkinMetadata["snout"] })}
            >
              <option value="mare">{t("skin.round")}</option>
              <option value="stallion">{t("skin.square")}</option>
              <option value="flat">{t("skin.flat")}</option>
            </select>
          </Field>
          <Field label={t("skin.tailShape")}>
            <select
              aria-label={t("skin.tailShape")}
              value={meta.tailShape}
              onChange={(e) => write({ tailShape: e.target.value as SkinMetadata["tailShape"] })}
            >
              <option value="STRAIGHT">{t("skin.straight")}</option>
              <option value="BUMPY">{t("skin.bumpy")}</option>
              <option value="SWIRLY">{t("skin.swirly")}</option>
              <option value="SPIKY">{t("skin.spiky")}</option>
            </select>
          </Field>
        </div>
        <Field label={t("skin.tailLengthValue", { length: meta.tailLength })}>
          <input
            type="range"
            aria-label={t("skin.tailLength")}
            min={0}
            max={4}
            value={meta.tailLength}
            onChange={(e) => write({ tailLength: +e.target.value })}
          />
        </Field>
      </details>
      <details open className="settings-group">
        <summary>{t("skin.preview")}</summary>
        <p className="muted">{t("skin.previewHint")}</p>
        {onSlim ? <Toggle label="Slim" checked={slim ?? meta.slim} onChange={onSlim} /> : null}
        <Toggle
          label={t("skin.extendWings")}
          checked={preview.wings === "extended"}
          onChange={(v) => onPreview({ wings: v ? "extended" : "folded" })}
        />
        {["SEAPONY", "HIPPOGRIFF"].includes(meta.race) ? (
          <Field label={t("skin.form")}>
            <select
              aria-label={t("skin.form")}
              value={preview.form}
              onChange={(e) => onPreview({ form: e.target.value as PreviewSettings["form"] })}
            >
              <option value="skin">{t("skin.fromSkin")}</option>
              <option value="wet">{t("skin.aquatic")}</option>
              <option value="dry">{t("skin.land")}</option>
            </select>
          </Field>
        ) : null}
      </details>
      {document.sourceFormat === "legacy" ? (
        <p className="studio-notice">{t("skin.legacyNotice")}</p>
      ) : null}
    </div>
  );
}
