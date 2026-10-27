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
      setError(reason instanceof Error ? reason.message : String(reason));
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
          <h2 id="import-title">Открыть скин{second ? " · второй" : ""}</h2>
          <p>Загрузите PNG с компьютера или по ссылке</p>
        </div>
        <IconButton label="Закрыть импорт" disabled={busy} onClick={onClose}>
          <XMarkIcon />
        </IconButton>
      </div>
      {pending ? (
        <div className="replace-notice">
          <h3>В текущем скине есть изменения</h3>
          <p>
            Несохранённые изменения будут потеряны. Перед заменой можно сохранить их отдельным PNG.
          </p>
          <div className="dialog-actions">
            <Button onClick={() => (initialFile ? onClose() : setPending(null))} disabled={busy}>
              Отмена
            </Button>
            <Button
              onClick={async () => {
                setBusy(true);
                try {
                  await onExport();
                  await run(pending);
                } catch {
                  setError("Не удалось экспортировать текущий скин");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Экспортировать и открыть
            </Button>
            <Button tone="primary" onClick={() => void run(pending)} disabled={busy}>
              Заменить
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
            <h3>Перетащите PNG сюда</h3>
            <p>64 × 64, 64 × 32 и HD до 2048 px</p>
            <Button disabled={busy} onClick={() => input.current?.click()}>
              Выбрать файл
            </Button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim()) accept(url.trim());
            }}
          >
            <label className="studio-field">
              <span>Ссылка на PNG</span>
              <input
                aria-label="Ссылка на скин"
                type="url"
                placeholder="https://example.com/skin.png"
                required
                value={url}
                onChange={(e) => setURL(e.target.value)}
              />
            </label>
            <div className="dialog-actions">
              <Button type="submit" tone="primary" disabled={busy}>
                Открыть по ссылке
              </Button>
            </div>
          </form>
        </>
      )}
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept="image/png"
        aria-label="Открыть PNG"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) accept(file);
          e.target.value = "";
        }}
      />
      {busy ? <output>Загрузка скина…</output> : null}
      {error ? (
        <p role="alert" className="studio-error">
          {error}
        </p>
      ) : null}
      <Button tone="ghost" disabled={busy} onClick={() => accept("/steve_pony.png")}>
        Использовать пример скина
      </Button>
      <p className="import-footnote">
        Служебные пиксели, раса и аксессуары считываются автоматически.
      </p>
    </dialog>
  );
}
