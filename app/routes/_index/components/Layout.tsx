import type { PropsWithChildren } from "react";

export function Layout({children}: PropsWithChildren) {
  return (
    <div className='w-screen h-[100svh] bg-zinc-700 relative'>{children}</div>
  );
}
