import type { MetaFunction } from "@remix-run/node";
import { useEffect, useState } from "react";
import {
  StripedContextProvider,
  StripedViewer,
} from "~/components/striped-viewer.client";
import { EditorInterface } from "~/components/EditorInterface";
import { EditorProvider } from "~/components/EditorContext";

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
    </div>
  );
}

function EditorClientWrapper({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  if (!hydrated) return null;

  return (
    <StripedContextProvider
      viewerPreferencesParams={{ defaultSkinUrl: "/steve_pony.png" }}
    >
      <StripedViewer.Component />

      <EditorProvider>{children}</EditorProvider>
    </StripedContextProvider>
  );
}
