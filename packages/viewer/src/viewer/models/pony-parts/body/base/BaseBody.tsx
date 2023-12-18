import BaseBodyFront from "./BaseBodyFront.js";
import BaseBodyMiddle from "./BaseBodyMiddle.js";
import BaseBodyBack from "./BaseBodyBack.js";

export default function BaseBody() {
  return (
    <>
      <BaseBodyFront />
      <BaseBodyMiddle />
      <BaseBodyBack />
    </>
  );
}
