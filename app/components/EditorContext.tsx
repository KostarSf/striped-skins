import { useSearchParams } from "react-router";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useViewerPreferencesContext, usePonyContext } from "./striped-viewer.client";
import { PonySkin } from "@striped-skins/api";
import { getSafeSkinUrl } from "../utils";

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
  const firstLoaded = useViewerPreferencesContext((s) => s.firstSkinUrl);
  const secondLoaded = useViewerPreferencesContext((s) => s.secondSkinUrl);
  const firstPony = usePonyContext((s) => s.firstPony.skin);
  const secondPony = usePonyContext((s) => s.secondPony.skin);

  const previousParams = useRef({ first: params.get("skin"), second: params.get("second-skin") });

  useEffect(() => {
    const removedFirst = previousParams.current.first !== null && !params.has("skin");
    const removedSecond = previousParams.current.second !== null && !params.has("second-skin");
    previousParams.current = { first: params.get("skin"), second: params.get("second-skin") };
    setFirstSkinState(params.get("skin"));
    setSecondSkinState(params.get("second-skin"));
    const first = getSafeSkinUrl(params.get("skin")),
      second = getSafeSkinUrl(params.get("second-skin"));
    if (
      removedFirst ||
      firstPony === PonySkin.DEFAULT ||
      (first && first !== firstLoaded && first !== firstPony.sourceUrl)
    )
      viewerSetFirstSkin(first);
    if (
      removedSecond ||
      secondPony === PonySkin.DEFAULT ||
      (second && second !== secondLoaded && second !== secondPony.sourceUrl)
    )
      viewerSetSecondSkin(second);
  }, [
    params,
    viewerSetFirstSkin,
    viewerSetSecondSkin,
    firstPony,
    secondPony,
    firstLoaded,
    secondLoaded,
  ]);

  const secondSkinParam = params.get("second-skin");
  useEffect(() => {
    if (secondSkinParam) setMode("side-by-side");
  }, [secondSkinParam, setMode]);

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
      viewerSetFirstSkin(getSafeSkinUrl(url));
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
      viewerSetSecondSkin(getSafeSkinUrl(url));
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
