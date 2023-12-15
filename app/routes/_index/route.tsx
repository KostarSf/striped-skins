import type { MetaFunction } from "@remix-run/node";
import { StripedViewer } from "@striped-skins/viewer";
import { useEffect } from "react";
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
  useEffect(() => {
    StripedViewer.preferences.set({
      defaultSkinUrl: "/steve_pony.png",
    });
  }, []);

  return (
    <div className='w-screen h-[100svh] viewer-background relative'>
      <StripedViewer.Component />

      <div className='absolute left-0 right-0 top-0 pointer-events-none'></div>

      <div className='absolute left-0 right-0 bottom-0 pointer-events-none p-4'>
        <p className='text-zinc-400 text-xs/none font-mono'>
          {"v" + APP_VERSION}
        </p>
      </div>
    </div>
  );
}
