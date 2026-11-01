import { useTranslation } from "react-i18next";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  PonyPreview,
  type PonyPreviewProps,
  type CameraAction,
  type CameraState,
} from "@striped-skins/viewer/experimental";
import { decodeSkinMetadata } from "@striped-skins/api";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ViewOptions } from "./ViewOptions";
import { Button, DesignIcon, IconButton } from "./ui";
import { useDocumentSetting } from "./useDocumentSetting";
import { useSkinDrop } from "./useSkinDrop";
const DevPerformanceMonitor = import.meta.env.DEV
  ? lazy(() => import("../DevPerformanceMonitor"))
  : null;
export function ModelViewport({
  title,
  mini = false,
  onClose,
  children,
  headerActions,
  onFileDrop,
  persistWorkspace = false,
  ...props
}: PonyPreviewProps & {
  persistWorkspace?: boolean;
  title?: string | null;
  mini?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
  headerActions?: React.ReactNode;
  onFileDrop?: (file: File) => void;
}) {
  const { t } = useTranslation();
  const displayTitle = title === undefined ? t("viewport.model") : title;
  const drop = useSkinDrop(onFileDrop);
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
  const cameraPointer = useRef<number | null>(null);
  const [cameraDragging, setCameraDragging] = useState(false);
  const cameraButtons = props.painting ? 6 : 7;
  const paintBlocked = !props.onSample && !!props.document.paintBlockedReason;
  useEffect(() => {
    const release = (event: PointerEvent) => {
      if (event.pointerId !== cameraPointer.current) return;
      const dragging = event.type !== "pointercancel" && !!(event.buttons & cameraButtons);
      setCameraDragging(dragging);
      if (event.type === "pointercancel" || !event.buttons) cameraPointer.current = null;
    };
    const clear = () => {
      cameraPointer.current = null;
      setCameraDragging(false);
    };
    window.addEventListener("pointerup", release, true);
    window.addEventListener("pointercancel", release, true);
    window.addEventListener("pointermove", release, true);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("pointerup", release, true);
      window.removeEventListener("pointercancel", release, true);
      window.removeEventListener("pointermove", release, true);
      window.removeEventListener("blur", clear);
    };
  }, [cameraButtons]);
  const scaleOutput = useRef<HTMLSpanElement>(null);
  const reportScale = useCallback((scale: number) => {
    // Camera motion is transient; update the readout without rebuilding the React scene.
    if (scaleOutput.current) scaleOutput.current.textContent = `${Math.round(scale * 100)}%`;
  }, []);
  const [savedProjection, setSavedProjection] = useDocumentSetting<"perspective" | "orthographic">(
    props.document,
    "projection",
    "perspective",
  );
  const [localProjection, setLocalProjection] = useState<"perspective" | "orthographic">(
    "perspective",
  );
  const projection = persistWorkspace ? savedProjection : localProjection;
  const setProjection = persistWorkspace ? setSavedProjection : setLocalProjection;
  const [cameraState, setCameraState] = useDocumentSetting<CameraState | null>(
    props.document,
    "cameraState",
    null,
  );
  const [maximized, setMaximized] = useState(false);
  const [savedView, setSavedView] = useDocumentSetting<string>(
    props.document,
    "cameraView",
    "perspective",
  );
  const [localView, setLocalView] = useState("perspective");
  const view = persistWorkspace ? savedView : localView;
  const setView = persistWorkspace ? setSavedView : setLocalView;
  const [action, setAction] = useState<CameraAction>({ id: 0, kind: "reset" });
  const command = (kind: CameraAction["kind"], nextProjection = projection) => {
    if (kind === "reset") setView(nextProjection);
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
      aria-label={t("viewport.preview")}
      data-cursor={
        cameraDragging
          ? "grabbing"
          : props.painting
            ? paintBlocked
              ? "not-allowed"
              : "crosshair"
            : "grab"
      }
      onPointerDownCapture={(event) => {
        if (event.target instanceof HTMLCanvasElement && event.pointerType !== "touch") {
          cameraPointer.current = event.pointerId;
          setCameraDragging(!!(event.buttons & cameraButtons));
        }
      }}
      {...drop.handlers}
    >
      <PonyPreview
        {...props}
        fitKey={fitKey}
        cameraAction={action}
        projection={projection}
        onScale={reportScale}
        cameraState={persistWorkspace ? cameraState : undefined}
        onCameraState={persistWorkspace ? setCameraState : undefined}
      >
        {DevPerformanceMonitor && new URLSearchParams(location.search).get("perf") === "1" ? (
          <Suspense fallback={null}>
            <DevPerformanceMonitor />
          </Suspense>
        ) : null}
      </PonyPreview>
      {drop.dragging ? <div className="skin-drop-overlay">{t("import.dropPng")}</div> : null}
      <div className="viewport-heading">
        {displayTitle ? <h2>{displayTitle}</h2> : null}
        <div className="viewport-heading-actions">
          {mini && onClose ? (
            <IconButton label={t("viewport.hidePreview")} onClick={onClose}>
              <XMarkIcon />
            </IconButton>
          ) : null}
          {!mini ? (
            <select
              aria-label={t("viewport.cameraAngle")}
              value={view}
              onChange={(e) => {
                setView(e.target.value);
                if (e.target.value === "orthographic" || e.target.value === "perspective") {
                  setProjection(e.target.value);
                  command("reset", e.target.value);
                } else command(e.target.value as CameraAction["kind"]);
              }}
            >
              <option value="perspective">{t("viewport.perspective")}</option>
              <option value="orthographic">{t("viewport.orthographic")}</option>
              <option value="front">{t("viewport.front")}</option>
              <option value="back">{t("viewport.back")}</option>
              <option value="left">{t("viewport.left")}</option>
              <option value="right">{t("viewport.right")}</option>
            </select>
          ) : null}
          {!mini ? <ViewOptions document={persistWorkspace ? props.document : undefined} /> : null}
          {headerActions}
        </div>
      </div>
      {!mini ? (
        <div className="viewport-footer">
          <div className="camera-actions">
            <span className="viewport-hint">
              <span>{props.painting ? t("viewport.paintHint") : t("viewport.orbitHint")}</span>
              <span>{t("viewport.panHint")}</span>
            </span>
            <div className="zoom-controls">
              <IconButton label={t("viewport.zoomOut")} onClick={() => command("out")}>
                −
              </IconButton>
              <span
                ref={scaleOutput}
                data-testid="model-scale"
                aria-label={t("viewport.zoom")}
                title={t("viewport.fitPercentage")}
              >
                100%
              </span>
              <IconButton label={t("viewport.zoomIn")} onClick={() => command("in")}>
                +
              </IconButton>
            </div>
            <IconButton
              data-action="reset-view"
              label={t("viewport.reset")}
              onClick={() => command("reset")}
            >
              <DesignIcon name="reset" />
            </IconButton>
            <IconButton
              label={t("viewport.fullscreen")}
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
        {t("viewport.fit")}
      </Button>
    </section>
  );
}
