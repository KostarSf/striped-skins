import { useEffect, useRef } from "react";
import { Euler, Vector3, type Group, type Object3DEventMap } from "three";
import { useViewerParameters } from "../ViewerParametersContext";
import { useThree } from "@react-three/fiber";
import { getViewerCanvasWrapper } from "~/utils";

const xAxis = new Vector3(1, 0, 0);
const yAxis = new Vector3(0, 1, 0);

export default function () {
  const { isSideBySideMode } = useViewerParameters();

  const invalidate = useThree(state => state.invalidate)

  const pony1ref = useRef<Group<Object3DEventMap>>(null);
  const pony2ref = useRef<Group<Object3DEventMap>>(null);

  const lastCursorPos = useRef([0, 0])

  const rotatedByPointer = useRef(false);

  useEffect(() => {
    const canvas = getViewerCanvasWrapper()
    if (!canvas) return;

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointermove", onPointerMove);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  useEffect(() => {
    if (!isSideBySideMode) {
      pony1ref.current?.setRotationFromEuler(new Euler(0, 0, 0));
      pony2ref.current?.setRotationFromEuler(new Euler(0, 0, 0));
    }
  }, [isSideBySideMode]);

  const onPointerDown = () => {
    if (!isSideBySideMode) return;
    rotatedByPointer.current = true;
  };
  const onPointerUp = () => {
    rotatedByPointer.current = false;
    lastCursorPos.current = [0, 0];
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!rotatedByPointer.current) return;

    if (lastCursorPos.current[0] === 0 && lastCursorPos.current[1] === 0) {
      lastCursorPos.current = [e.clientX, e.clientY]
    }

    const movementX = e.clientX - lastCursorPos.current[0];
    const movementY = e.clientY - lastCursorPos.current[1];

    const rotationXDifference = movementX / 100;
    const rotationYDifference = movementY / 200;

    lastCursorPos.current = [e.clientX, e.clientY]

    pony1ref.current?.rotateOnWorldAxis(yAxis, rotationXDifference);
    pony1ref.current?.rotateOnWorldAxis(xAxis, rotationYDifference);

    pony2ref.current?.rotateOnWorldAxis(yAxis, rotationXDifference);
    pony2ref.current?.rotateOnWorldAxis(xAxis, rotationYDifference);

    invalidate();
  };

  return {
    pony1ref,
    pony2ref,
  };
}
