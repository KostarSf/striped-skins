import StraightTailPart from "./StraightTailPart.js";
import StraightTailBeginning from "./StraightTailBeginning.js";
import type { XyzArray } from "../../../primitives/index.js";
import type { TailSize } from "@striped-skins/api/build/types/skin-parameters/TailLength.js";

type StraightTailProps = {
  position?: XyzArray;
  length?: TailSize;
};

export default function StraightTail({
  position,
  length = 4,
}: StraightTailProps) {
  return (
    <group position={position}>
      <StraightTailBeginning position={[0, 0.85, -0.05]} />

      {length > 0 && (
        <StraightTailPart
          position={[0, 1, -0.5]}
          type='topHalf'
          drawTop
          drawBottom={length === 1}
        />
      )}
      {length > 1 && (
        <StraightTailPart
          position={[0, 0.2, -0.5]}
          type='bottomHalf'
          drawBottom={length === 2}
        />
      )}
      {length > 2 && (
        <StraightTailPart
          position={[0, -0.6, -0.5]}
          type='topHalf'
          drawBottom={length === 3}
        />
      )}
      {length > 3 && (
        <StraightTailPart
          position={[0, -1.4, -0.5]}
          type='bottomHalf'
          drawBottom={length === 4}
        />
      )}
    </group>
  );
}
