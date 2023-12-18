import { createContext, useContext } from "react";

export const ThreeCanvasContext =
  createContext<React.MutableRefObject<HTMLCanvasElement | null> | null>(null);

export const useThreeCanvas = () => {
  return useContext(ThreeCanvasContext)?.current ?? null;
};

type ThreeCanvasProviderProps = {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null> | null;
  children?: React.ReactNode;
};

export function ThreeCanvasProvider({
  canvasRef,
  children,
}: ThreeCanvasProviderProps) {
  return (
    <ThreeCanvasContext.Provider value={canvasRef}>
      {children}
    </ThreeCanvasContext.Provider>
  );
}
