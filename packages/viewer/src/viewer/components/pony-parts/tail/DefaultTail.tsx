import DefaultTailPart from "./DefaultTailPart";
import DefaultTailBeginning from "./DefaultTailBeginning";
import type { XyzArray } from "../../model-components/types";
import type { TailSize } from "@striped-skins/api/build/skin-parameters";

type DefaultTailProps = {
  position?: XyzArray;
  length?: TailSize
};

export default function DefaultTail({ position, length = 4 }: DefaultTailProps) {
  return (
    <group position={position}>
      <DefaultTailBeginning position={[0, 0.85, -0.05]} />

      {length > 0 && (
        <DefaultTailPart
          position={[0, 1, -0.5]}
          type='topHalf'
          drawTop
          drawBottom={length === 1}
        />
      )}
      {length > 1 && (
        <DefaultTailPart
          position={[0, 0.2, -0.5]}
          type='bottomHalf'
          drawBottom={length === 2}
        />
      )}
      {length > 2 && (
        <DefaultTailPart
          position={[0, -0.6, -0.5]}
          type='topHalf'
          drawBottom={length === 3}
        />
      )}
      {length > 3 && (
        <DefaultTailPart
          position={[0, -1.4, -0.5]}
          type='bottomHalf'
          drawBottom={length === 4}
        />
      )}
    </group>
  );
}
