import { useState, type DragEvent } from "react";

export function useSkinDrop(onFile?: (file: File) => void) {
  const [dragging, setDragging] = useState(false);
  const isFileDrag = (event: DragEvent) => !!onFile && event.dataTransfer.types.includes("Files");
  return {
    dragging,
    handlers: {
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!isFileDrag(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDragging(true);
      },
      onDragLeave: (event: DragEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        if (!isFileDrag(event)) return;
        event.preventDefault();
        event.stopPropagation();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) onFile?.(file);
      },
    },
  };
}
