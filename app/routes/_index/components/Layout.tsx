import type { PropsWithChildren } from "react";

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className='w-screen h-[100svh] viewer-background relative'>
      <div className='absolute top-0 left-0 right-0 h-24 header-background pointer-events-none' />
      {children}
    </div>
  );
}
