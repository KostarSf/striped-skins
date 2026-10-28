import type { CSSProperties } from "react";

type Mode = "viewer" | "editor";
function Bone({
  width = "100%",
  height = 12,
  className = "",
}: {
  width?: CSSProperties["width"];
  height?: number;
  className?: string;
}) {
  return <span className={`skeleton-bone ${className}`} style={{ width, height }} />;
}
function Control({ width = 80 }: { width?: number }) {
  return (
    <span className="skeleton-control" style={{ width }}>
      <Bone width="60%" height={8} />
    </span>
  );
}
function SkeletonHeader({ mode }: { mode: Mode }) {
  return (
    <header className="studio-header" aria-hidden="true">
      <div className="studio-brand">
        <img className="brand-mark" src="/icon.png" width={28} height={28} alt="" />
        <span>Striped Skins</span>
      </div>
      <div className="mode-tabs">
        <span className="skeleton-tab" data-active={mode === "viewer"}>
          Просмотр
        </span>
        <span className="skeleton-tab" data-active={mode === "editor"}>
          Редактор
        </span>
      </div>
      <div className="document-name">
        <span className="document-dot" />
        <div className="skeleton-document">
          <Bone width={110} />
          <Bone width={145} height={7} />
        </div>
      </div>
      <div className="file-actions">
        <span className="studio-button">
          <Bone width={60} height={9} />
        </span>
        <span className="studio-button primary skeleton-export">
          <Bone width={90} height={9} />
        </span>
      </div>
    </header>
  );
}
function Viewport({ texture = false, viewer = false }: { texture?: boolean; viewer?: boolean }) {
  return (
    <div
      className={`skeleton-viewport ${texture ? "skeleton-texture" : ""}`}
      data-skeleton-panel={texture ? "texture" : "model"}
    >
      <div className={`skeleton-viewport-top ${viewer ? "skeleton-viewer-controls" : ""}`}>
        {viewer ? (
          <div className="inline-controls">
            <Control width={158} />
            <Control width={64} />
          </div>
        ) : (
          <Bone width={75} height={9} />
        )}
        <div className="inline-controls">
          <Control width={texture ? 42 : viewer ? 94 : 120} />
          <Control width={texture ? 54 : viewer ? 150 : 44} />
          {!texture && !viewer ? <Control width={44} /> : null}
        </div>
      </div>
      <div className={`skeleton-viewport-bottom ${viewer ? "skeleton-viewer-bottom" : ""}`}>
        <Bone width={125} height={7} />
        <div className="inline-controls">
          <Control width={112} />
          <Control width={36} />
        </div>
        {viewer ? <Control width={36} /> : null}
      </div>
    </div>
  );
}
function EditorBody() {
  return (
    <>
      <div className="brush-toolbar" aria-hidden="true">
        <div className="current-tool">
          <Bone width={17} height={17} />
          <Bone width={48} height={9} />
        </div>
        <span className="toolbar-divider" />
        <div className="inline-field skeleton-size-field">
          <Bone width={43} height={8} />
          <Control width={55} />
        </div>
        <div className="inline-field opacity-field">
          <Bone width={83} height={8} />
          <Control width={80} />
        </div>
        <div className="inline-controls">
          <Control width={36} />
          <Control width={36} />
        </div>
        <Control width={140} />
        <div className="layout-tabs inline-controls">
          <Control width={54} />
          <Control width={70} />
          <Control width={54} />
        </div>
      </div>
      <div className="editor-workspace layout-split mobile-view-3d" aria-hidden="true">
        <div className="tool-rail">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="icon-button skeleton-tool">
              <Bone width={18} height={18} />
            </span>
          ))}
          <span className="rail-divider" />
          <Bone width={30} height={30} />
          <Bone width={18} height={18} />
          <span className="rail-spacer" />
          <Bone width={18} height={18} />
        </div>
        <div className="editor-center">
          <div className="editor-views">
            <Viewport />
            <div className="texture-slot">
              <Viewport texture />
            </div>
          </div>
          <div className="palette-panel">
            <div className="skin-palette">
              <Bone width={80} height={7} />
              <div>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Bone key={i} width={22} height={22} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="inspector studio-panel">
          <Bone width={80} height={13} />
          <Bone width={170} height={7} />
          <div className="skin-settings">
            {[0, 1, 2].map((i) => (
              <div key={i} className="settings-group skeleton-settings">
                <Bone width={55 + i * 10} height={8} />
                <Control width={240} />
              </div>
            ))}
            <div className="settings-group skeleton-settings">
              <Bone width={100} />
              <Bone width={180} height={7} />
              <div className="skeleton-accessories">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Control key={i} width={105} />
                ))}
              </div>
            </div>
            <div className="settings-group skeleton-settings">
              <Bone width={110} />
              <Bone width="100%" height={32} />
              <Bone width="80%" height={6} />
            </div>
          </div>
        </div>
      </div>
      <div className="mobile-editor-footer skeleton-mobile-footer" aria-hidden="true">
        <div className="inline-controls">
          <Control width={52} />
          <Control width={52} />
          <Control width={52} />
        </div>
        <Control width={36} />
        <Control width={40} />
      </div>
    </>
  );
}
function Footer() {
  return (
    <footer className="studio-status" aria-hidden="true">
      <Bone width={95} height={7} />
      <Bone width={220} height={7} />
      <Bone width={140} height={7} />
    </footer>
  );
}
/** No viewer/editor dependencies: the same lightweight layout is rendered by SSR and lazy fallbacks. */
export function StudioSkeleton({
  mode = "viewer",
  bodyOnly = false,
}: {
  mode?: Mode;
  bodyOnly?: boolean;
}) {
  const content = (
    <>
      {mode === "editor" ? (
        <EditorBody />
      ) : (
        <div className="viewer-content" aria-hidden="true">
          <Viewport viewer />
        </div>
      )}
      <Footer />
    </>
  );
  const label = mode === "editor" ? "Загрузка редактора" : "Загрузка просмотрщика";
  return bodyOnly ? (
    <div
      className="studio-skeleton skeleton-body"
      data-testid="studio-skeleton"
      data-mode={mode}
      aria-busy="true"
    >
      <output className="sr-only">{label}</output>
      {content}
    </div>
  ) : (
    <main
      className={`studio-app studio-skeleton ${mode === "editor" ? "editor-app" : "viewer-app"}`}
      data-testid="studio-skeleton"
      data-mode={mode}
      aria-busy="true"
    >
      <output className="sr-only">{label}</output>
      <SkeletonHeader mode={mode} />
      {content}
    </main>
  );
}
