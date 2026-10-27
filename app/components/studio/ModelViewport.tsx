import { useEffect, useRef, useState } from "react";
import {
  PonyPreview,
  type PonyPreviewProps,
  type CameraAction,
} from "@striped-skins/viewer/experimental";
import { decodeSkinMetadata } from "@striped-skins/api";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ViewOptions } from "./ViewOptions";
import { Button, DesignIcon, IconButton } from "./ui";
export function ModelViewport({
  title = "3D-модель",
  mini = false,
  onClose,
  children,
  ...props
}: PonyPreviewProps & {
  title?: string;
  mini?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}) {
  const metadata = decodeSkinMetadata(props.document);
  const fitKey = JSON.stringify([
    props.document.id,
    metadata.race,
    metadata.size,
    metadata.wearables,
    props.preview,
    props.comparison?.document.id,
    props.comparison ? decodeSkinMetadata(props.comparison.document) : null,
    props.comparison?.preview,
  ]);
  const host = useRef<HTMLElement>(null);
  const [projection, setProjection] = useState<"perspective" | "orthographic">("perspective");
  const [maximized, setMaximized] = useState(false);
  const [view, setView] = useState("perspective");
  const [action, setAction] = useState<CameraAction>({ id: 0, kind: "reset" });
  const command = (kind: CameraAction["kind"]) => {
    if (kind === "reset") setView(projection);
    setAction((a) => ({ id: a.id + 1, kind }));
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !(e.target as HTMLElement).closest("dialog")) setMaximized(false);
      if (
        e.key.toLowerCase() !== "f" ||
        (e.target as HTMLElement).closest("input,select,textarea,dialog")
      )
        return;
      setAction((a) => ({ id: a.id + 1, kind: "reset" }));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <section
      ref={host}
      className={`model-viewport ${mini ? "mini-preview" : ""} ${maximized ? "maximized" : ""}`}
      aria-label="Предпросмотр модели"
    >
      <PonyPreview {...props} fitKey={fitKey} cameraAction={action} projection={projection} />
      <div className="viewport-heading">
        <h2>{title}</h2>
        <div className="viewport-heading-actions">
          {mini && onClose ? (
            <IconButton label="Скрыть 3D-превью" onClick={onClose}>
              <XMarkIcon />
            </IconButton>
          ) : null}
          {!mini ? (
            <select
              aria-label="Ракурс модели"
              value={view}
              onChange={(e) => {
                setView(e.target.value);
                if (e.target.value === "orthographic" || e.target.value === "perspective") {
                  setProjection(e.target.value);
                  command("reset");
                } else command(e.target.value as CameraAction["kind"]);
              }}
            >
              <option value="perspective">Перспектива</option>
              <option value="orthographic">Ортография</option>
              <option value="front">Спереди</option>
              <option value="back">Сзади</option>
              <option value="left">Слева</option>
              <option value="right">Справа</option>
            </select>
          ) : null}
          {!mini ? <ViewOptions /> : null}
        </div>
      </div>
      {!mini ? (
        <div className="viewport-footer">
          <div className="camera-actions">
            <span className="viewport-hint">
              <span>
                {props.painting ? "ЛКМ · рисовать · СКМ · вращать" : "ЛКМ / СКМ · вращать"}
              </span>
              <span>ПКМ · панорама · колесо · масштаб</span>
            </span>
            <div className="zoom-controls">
              <IconButton label="Отдалить модель" onClick={() => command("out")}>
                −
              </IconButton>
              <span>Масштаб</span>
              <IconButton label="Приблизить модель" onClick={() => command("in")}>
                +
              </IconButton>
            </div>
            <IconButton label="Сброс вида" onClick={() => command("reset")}>
              <DesignIcon name="reset" />
            </IconButton>
            <IconButton
              label="Полноэкранный вид"
              onClick={() => {
                if (maximized) {
                  setMaximized(false);
                  return;
                }
                if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
                else if (typeof host.current?.requestFullscreen === "function")
                  void host.current.requestFullscreen().catch(() => setMaximized(true));
                else setMaximized(true);
              }}
            >
              <DesignIcon name="expand" />
            </IconButton>
          </div>
        </div>
      ) : null}
      {children}
      <Button className="sr-only" onClick={() => command("reset")}>
        Вписать модель в окно
      </Button>
    </section>
  );
}
