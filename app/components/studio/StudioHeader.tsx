import { Link, useSearchParams } from "react-router";
import { ArrowDownTrayIcon, FolderOpenIcon } from "@heroicons/react/24/outline";
import { Button } from "./ui";
export function StudioHeader({
  mode,
  second,
  name,
  dirty,
  onImport,
  onExport,
  saving,
}: {
  mode: "viewer" | "editor";
  second: boolean;
  name: string;
  dirty: boolean;
  onImport: () => void;
  onExport: () => void;
  saving: boolean;
}) {
  const [params] = useSearchParams();
  const editor = new URLSearchParams(params);
  editor.set("slot", second ? "second" : "first");
  const viewer = new URLSearchParams(params);
  viewer.delete("slot");
  return (
    <header className="studio-header">
      <Link
        className="studio-brand"
        to={viewer.size ? `/?${viewer}` : "/"}
        aria-label="Striped Skins — просмотрщик"
      >
        <img
          className="brand-mark"
          src="/icon.png"
          width={28}
          height={28}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <span>Striped Skins</span>
      </Link>
      <nav className="mode-tabs" aria-label="Режим приложения">
        <Link
          aria-label="← Просмотрщик"
          aria-current={mode === "viewer" ? "page" : undefined}
          to={viewer.size ? `/?${viewer}` : "/"}
        >
          Просмотр
        </Link>
        <Link
          aria-label={second ? "Редактировать второй" : "Редактировать"}
          aria-current={mode === "editor" ? "page" : undefined}
          to={`/editor?${editor}`}
        >
          Редактор
        </Link>
      </nav>
      <div className="document-name">
        <span className="document-dot" data-dirty={dirty} />
        <div>
          <strong title={name}>{name}</strong>
          <small aria-live="polite">
            {dirty ? "Есть изменения" : "Все изменения сохранены"}
            {second ? " · второй скин" : ""}
          </small>
        </div>
      </div>
      <div className="file-actions">
        <Button onClick={onImport}>
          <FolderOpenIcon />
          <span>Открыть</span>
        </Button>
        <Button tone="primary" aria-label="Скачать PNG" disabled={saving} onClick={onExport}>
          <ArrowDownTrayIcon />
          <span>{saving ? "Сохранение…" : "Экспорт PNG"}</span>
        </Button>
      </div>
    </header>
  );
}
