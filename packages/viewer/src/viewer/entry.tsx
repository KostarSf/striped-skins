import React from "react";
import ReactDOM from "react-dom/client";
import { Viewer } from "./Viewer";

export function attach(target: string | HTMLElement) {
  const domElement =
    typeof target === "string" ? document.querySelector(target) : target;

  if (!domElement) {
    throw new Error(`The DOM element ${domElement} is not accessable`);
  }

  const root = ReactDOM.createRoot(domElement);

  root.render(
    <React.StrictMode>
      <Viewer />
    </React.StrictMode>
  );

  return root;
}
