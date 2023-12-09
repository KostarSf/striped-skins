import type { XyzArray } from "~/components/model-components/types";
import { BaseBody } from "./BaseBody";
import { useSkinTextureContext } from "~/components/model-components/skinTextureContext";
import { BodyClothes } from "./BodyClothes";

type BodyProps = {
  position: XyzArray;
};
export function Body({ position }: BodyProps) {
  const { oldSkinFormat } = useSkinTextureContext();

  return (
    <>
      <BaseBody position={position} />
      {!oldSkinFormat && <BodyClothes position={position} />}
    </>
  );
}
