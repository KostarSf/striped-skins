import type { XyzArray } from "~/components/model-components/types"
import { ClosedWing } from "./ClosedWing"

type WingsProps = {
  position: XyzArray
}

export function Wings({position}: WingsProps) {
  return (
    <group position={position}>
      <ClosedWing position={[-1, 0, 0]} side='right' />
      <ClosedWing position={[1, 0, 0]} side='left' />
    </group>
  );
}
