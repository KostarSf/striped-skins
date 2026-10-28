import { Perf } from "r3f-perf";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/** Imported only by the application's development server, with ?perf=1. */
export default function DevPerformanceMonitor() {
  const get = useThree((state) => state.get);
  const setFrameloop = useThree((state) => state.setFrameloop);
  useEffect(() => {
    const previous = get().frameloop;
    setFrameloop("always");
    return () => setFrameloop(previous);
  }, [get, setFrameloop]);
  return <Perf position="bottom-right" />;
}
