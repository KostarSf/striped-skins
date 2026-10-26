import { useSearchParams } from "react-router";
import { createContext, useContext, useEffect, useState } from "react";
import { useViewerPreferencesContext } from "./striped-viewer.client";

type EditorState = {
  firstSkin: string | null;
  secondSkin: string | null;
  setFirstSkin: (url: string | null) => void;
  setSecondSkin: (url: string | null) => void;
};

const EditorContext = createContext<EditorState | null>(null);

export const useEditorContext = (): EditorState => {
  const context = useContext(EditorContext);
  if (!context) throw new Error("EditorContext.Provider not found");
  return context;
};

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [params, setParams] = useSearchParams();

  const [firstSkin, setFirstSkinState] = useState(params.get("skin"));
  const [secondSkin, setSecondSkinState] = useState(params.get("second-skin"));

  const {
    setFirstSkin: viewerSetFirstSkin,
    setSecondSkin: viewerSetSecondSkin,
    setMode,
  } = useViewerPreferencesContext((state) => state);

  useEffect(() => {
    setFirstSkinState(params.get("skin"));
    setSecondSkinState(params.get("second-skin"));
    viewerSetFirstSkin(proxifySkinLink(params.get("skin")));
    viewerSetSecondSkin(proxifySkinLink(params.get("second-skin")));
    if (params.get("second-skin")) setMode("side-by-side");
  }, [params, viewerSetFirstSkin, viewerSetSecondSkin, setMode]);

  const setFirstSkin = (url: string | null) => {
    if (!url) {
      params.delete("skin");
      setParams(params);
      setFirstSkinState(null);
      viewerSetFirstSkin(null);
      return;
    }

    if (url.startsWith("https://") || url.startsWith("http://")) {
      params.set("skin", url);
      setParams(params);
      viewerSetFirstSkin("/skin-proxy?url=" + url);
    } else {
      setFirstSkinState(url);
      viewerSetFirstSkin(url);
    }
  };

  const setSecondSkin = (url: string | null) => {
    if (!url) {
      params.delete("second-skin");
      setParams(params);
      setSecondSkinState(null);
      viewerSetSecondSkin(null);
      return;
    }

    if (url.startsWith("https://") || url.startsWith("http://")) {
      params.set("second-skin", url);
      setParams(params);
      viewerSetSecondSkin("/skin-proxy?url=" + url);
    } else {
      setSecondSkinState(url);
      viewerSetSecondSkin(url);
    }
  };

  return (
    <EditorContext.Provider
      value={{
        firstSkin,
        secondSkin,
        setFirstSkin,
        setSecondSkin,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

function proxifySkinLink(url: string | null) {
  if (!url) return null;

  if (url.startsWith("https://") || url.startsWith("http://")) {
    return "/skin-proxy?url=" + url;
  }

  return url;
}
