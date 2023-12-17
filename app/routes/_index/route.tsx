import type { MetaFunction } from "@remix-run/node";
import { useEffect, useState } from "react";
import {
  StripedContextProvider,
  StripedViewer,
} from "~/components/striped-viewer.client";
import { EditorInterface } from "~/components/EditorInterface";
import { EditorProvider } from "~/components/EditorContext";
import { APP_VERSION } from "~/constants";

export const meta: MetaFunction = () => {
  return [
    { title: "Striped Skins - Mine Little Pony skin viewer" },
    {
      name: "description",
      content: "Watch and compare your awesome pony skins!",
    },
  ];
};

export default function Index() {
  return (
    <div className='w-screen h-[100svh] viewer-background relative'>
      <EditorClientWrapper>
        <EditorInterface />
      </EditorClientWrapper>

      <div className='absolute left-0 right-0 bottom-0 pointer-events-none p-4'>
        <p className='text-zinc-400 text-xs/none font-mono'>
          {"v" + APP_VERSION}
        </p>
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
      viewerPreferencesParams={{ defaultSkinUrl: "/steve_pony.png" }}
    >
      <StripedViewer.Component />
      <EditorProvider>{children}</EditorProvider>
    </StripedContextProvider>
  );
}

function LoadingScreen() {
  return (
    <div className='w-full h-full grid place-items-center'>
      <span className='loading-spinner' />
    </div>
  );
}
