import { Link } from "react-router";
import { StripedViewer } from "~/components/striped-viewer.client";
import { EditorInterface } from "~/components/EditorInterface";
import { EditorProvider } from "~/components/EditorContext";
import { APP_VERSION } from "~/constants";

export default function Index() {
  return (
    <div className="w-screen h-[100svh] viewer-background relative">
      {/* <div className="pointer-events-none absolute inset-0 mix-blend-overlay" /> */}

      <EditorProvider>
        <StripedViewer.Component />
        <EditorInterface />
      </EditorProvider>

      <div className="absolute left-0 right-0 bottom-0 pointer-events-none p-4">
        <small className="text-zinc-400 text-xs/none font-mono block">{"v" + APP_VERSION}</small>
        <Link to="/model-lab" className="pointer-events-auto text-xs text-orange-400">
          Лаборатория моделей →
        </Link>
      </div>
    </div>
  );
}
