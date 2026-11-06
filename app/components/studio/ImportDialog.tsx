import { errorMessage } from "../../i18n/errors";
import { useTranslation } from "react-i18next";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ArrowUpTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button, IconButton } from "./ui";
export function ImportDialog({
  open,
  onClose,
  onFile,
  onURL,
  dirty,
  onExport,
  second,
  initialFile,
}: {
  open: boolean;
  onClose: () => void;
  onFile: (file: File) => Promise<void>;
  onURL: (url: string) => Promise<void>;
  dirty: boolean;
  onExport: () => Promise<void>;
  second: boolean;
  initialFile?: File;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [url, setURL] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [drag, setDrag] = useState(false);
  const [pending, setPending] = useState<File | string | null>(null);
  const run = async (value: File | string) => {
    setBusy(true);
    setError("");
    try {
      if (typeof value === "string") await onURL(value);
      else await onFile(value);
      onClose();
    } catch (reason) {
      setError(errorMessage(t, reason));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };
  const accept = (value: File | string) => {
    if (dirty) setPending(value);
    else void run(value);
  };
  const startImport = useEffectEvent(() => {
    setError("");
    setPending(null);
    dialog.current?.showModal();
    if (initialFile) accept(initialFile);
  });
  useEffect(() => {
    if (open) startImport();
    else dialog.current?.close();
  }, [open, initialFile]);
  return (
    <dialog
      ref={dialog}
      className="studio-dialog"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      aria-labelledby="import-title"
    >
      <div className="dialog-heading">
        <div>
          <h2 id="import-title">
            {t("import.title")}
            {second ? t("import.secondSuffix") : ""}
          </h2>
          <p>{t("import.description")}</p>
        </div>
        <IconButton label={t("import.close")} disabled={busy} onClick={onClose}>
          <XMarkIcon />
        </IconButton>
      </div>
      {pending ? (
        <div className="replace-notice">
          <h3>{t("import.unsavedTitle")}</h3>
          <p>{t("import.unsavedDescription")}</p>
          <div className="dialog-actions">
            <Button onClick={() => (initialFile ? onClose() : setPending(null))} disabled={busy}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={async () => {
                setBusy(true);
                try {
                  await onExport();
                  await run(pending);
                } catch {
                  setError(t("errors.saveProject"));
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              {t("import.saveAndOpen")}
            </Button>
            <Button tone="primary" onClick={() => void run(pending)} disabled={busy}>
              {t("import.replace")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`drop-zone ${drag ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const file = e.dataTransfer.files[0];
              if (file && !busy) accept(file);
            }}
          >
            <ArrowUpTrayIcon />
            <h3>{t("import.drop")}</h3>
            <p>{t("import.dimensions")}</p>
            <Button disabled={busy} onClick={() => input.current?.click()}>
              {t("import.chooseFile")}
            </Button>
          </div>
          <form
            className="import-url-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim()) accept(url.trim());
            }}
          >
            <label className="studio-field">
              <span>{t("import.pngLink")}</span>
              <input
                aria-label={t("import.skinLink")}
                type="url"
                placeholder="https://example.com/skin.png"
                required
                value={url}
                onChange={(e) => setURL(e.target.value)}
              />
            </label>
            <div className="dialog-actions">
              <Button type="submit" tone="primary" disabled={busy}>
                {t("import.openLink")}
              </Button>
            </div>
          </form>
        </>
      )}
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept="image/png,.striped,application/zip"
        aria-label={t("file.openPng")}
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) accept(file);
          e.target.value = "";
        }}
      />
      {busy ? <output>{t("loading.skin")}</output> : null}
      {error ? (
        <p role="alert" className="studio-error">
          {error}
        </p>
      ) : null}
      <Button tone="ghost" disabled={busy} onClick={() => accept("/steve_pony.png")}>
        {t("import.example")}
      </Button>
    </dialog>
  );
}
