import type { Texture } from "three";
import type { XyzArray } from "~/components/model/types";
import { DefaultTailPart } from "./DefaultTailPart";
import { DefaultTailBeginning } from "./DefaultTailBeginning";

type DefaultTailProps = {
  texture: Texture;
  position: XyzArray;
  length: 1 | 2 | 3 | 4
};
export function DefaultTail({ texture, position, length }: DefaultTailProps) {
  return (
    <group position={position}>
      <DefaultTailBeginning texture={texture} position={[0, 0.85, -0.05]} />

      <DefaultTailPart
        texture={texture}
        position={[0, 1, -0.5]}
        type='topHalf'
        drawTop
        drawBottom={length === 1}
      />
      {length > 1 && (
        <DefaultTailPart
          texture={texture}
          position={[0, 0.2, -0.5]}
          type='bottomHalf'
          drawBottom={length === 2}
        />
      )}
      {length > 2 && (
        <DefaultTailPart
          texture={texture}
          position={[0, -0.6, -0.5]}
          type='topHalf'
          drawBottom={length === 3}
        />
      )}
      {length > 3 && (
        <DefaultTailPart
          texture={texture}
          position={[0, -1.4, -0.5]}
          type='bottomHalf'
          drawBottom={length === 4}
        />
      )}
    </group>
  );
}
