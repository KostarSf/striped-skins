import { StripedViewer } from "@striped-skins/viewer";
import { useEffect, useRef } from "react";

export default function ViewerTest() {
  const ref = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    StripedViewer.preferences.set({
      defaultSkinUrl: "/steve_pony.png",
    });

    setTimeout(() => {
      StripedViewer.preferences.set({
        firstSkinUrl:
          "/skin-proxy/?url=https://auth.mc4ep.net/media/skin/400e2059-a40a-40c0-acd4-9d13ffb8b404",
      });
    }, 500);

    StripedViewer.run(ref.current);
    return () => StripedViewer.stop();
  }, []);

  return (
    <div
      className='w-[50rem] h-[50rem] bg-slate-400'
      ref={ref}
      dangerouslySetInnerHTML={{
        __html: "not loaded",
      }}
    />
  );
}
