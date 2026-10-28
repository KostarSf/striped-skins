import { EffectComposer, SMAA } from "@react-three/postprocessing";
import { useThree } from "@react-three/fiber";
import { useCallback } from "react";
import { PremultipliedAlpha } from "../experimental/PremultipliedAlpha.js";

/** Screen-space AA needs a single-sampled scene and alpha-correct final output. */
export function SmaaPipeline() {
  const invalidate = useThree((state) => state.invalidate);
  const ready = useCallback(() => invalidate(), [invalidate]);
  return (
    <EffectComposer ref={ready} multisampling={0}>
      <SMAA />
      <PremultipliedAlpha />
    </EffectComposer>
  );
}
