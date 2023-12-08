import type { Texture } from "three"
import type { XyzArray } from "~/components/model/types"
import { DefaultTail } from "./DefaultTail"

type TailProps = {
  texture: Texture
  position: XyzArray
}
export function Tail({texture, position}: TailProps) {
  return (
    <>
      <DefaultTail texture={texture} position={position} length={4} />
    </>
  )
}
