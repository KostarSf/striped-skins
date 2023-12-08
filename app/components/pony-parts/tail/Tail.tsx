import type { XyzArray } from "~/components/model-components/types"
import { DefaultTail } from "./DefaultTail"

type TailProps = {
  position: XyzArray
}
export function Tail({position}: TailProps) {
  return (
    <>
      <DefaultTail position={position} length={4} />
    </>
  )
}
