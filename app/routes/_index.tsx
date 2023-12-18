import { useEffect, useState } from "react";
import {
  StripedContextProvider,
  StripedViewer,
} from "~/components/striped-viewer.client";
import { EditorInterface } from "~/components/EditorInterface";
import { EditorProvider } from "~/components/EditorContext";
import { APP_VERSION } from "~/constants";
import { LoadingScreen } from "~/components/LoadingScreen";

export default function Index() {
  return (
    <div className='w-screen h-[100svh] viewer-background relative'>
      {/* <div className="pointer-events-none absolute inset-0 mix-blend-overlay" /> */}

      <EditorClientWrapper>
        <EditorInterface />
      </EditorClientWrapper>

      <div className='absolute left-0 right-0 bottom-0 pointer-events-none p-4'>
        <small className='text-zinc-400 text-xs/none font-mono block'>
          {"v" + APP_VERSION}
        </small>
      </div>
    </div>
  );
}

function EditorClientWrapper({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return <LoadingScreen />;
  }

  return (
    <StripedContextProvider
      viewerPreferencesParams={{
        defaultSkinUrl: "/steve_pony.png",
        userOptions: {
          animations: !!(
            localStorage.getItem("viewer.options.animations") ?? true
          ),
          antialiasing: !!(
            localStorage.getItem("viewer.options.antialiasing") ?? true
          ),
          smoothCamera: !!(
            localStorage.getItem("viewer.options.smoothCamera") ?? true
          ),
        },
      }}
    >
      <StripedViewer.Component />
      <EditorProvider>{children}</EditorProvider>
    </StripedContextProvider>
  );
}
