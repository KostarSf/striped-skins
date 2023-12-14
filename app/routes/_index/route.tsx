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
  const SkinViewer = StripedViewer.getJsxComponent();

  useEffect(() => {
    StripedViewer.preferences.set({
      defaultSkinUrl: "/steve_pony.png",
      performanceMonitor: true,
    });

    setTimeout(() => {
      StripedViewer.preferences.set({
        firstSkinUrl:
          "https://cdn.discordapp.com/attachments/1027982135635742842/1184174627803639898/Kostar_64.png?ex=658b0390&is=65788e90&hm=8290e0cea820bd4a8cde5b21556c832eb6ba07300627cd154e7a081e3088d534&",
      });
    }, 1000);
  }, []);

  return (
    <div className='w-screen h-[100svh] viewer-background relative'>
      <SkinViewer />

      <div className='absolute left-0 right-0 top-0 pointer-events-none'></div>

      <div className='absolute left-0 right-0 bottom-0 pointer-events-none p-4'>
        <p className='text-zinc-400 text-xs/none font-mono'>
          {"v" + APP_VERSION}
        </p>
      </div>
    </div>
  );
}
