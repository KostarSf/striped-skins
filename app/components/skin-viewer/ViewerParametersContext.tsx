import { useSearchParams } from "@remix-run/react";
import { createContext, useContext, useEffect, useState } from "react";
import { getSafeSkinUrl } from "~/utils";

export type ComparisonModeType = "off" | "on" | "side-by-side";

type ViewerParameters = {
  firstSkin: string;
  secondSkin: string;
  setFirstSkin: (url: string, updateUrl: boolean) => void;
  setSecondSkin: (url: string, updateUrl: boolean) => void;

  defaultSkin: string;

  isDefaultMode: boolean;
  isComparisonMode: boolean;
  isSideBySideMode: boolean;
  comparisonMode: ComparisonModeType;
  setComparisonMode: (state: ComparisonModeType) => void;

  activeSkin: "first" | "second";
  setActiveSkin: (state: "first" | "second") => void;

  mobileView: boolean;
};

const Context = createContext<ViewerParameters | null>(null);

type ViewerParametersContextProps = {
  children?: React.ReactNode;
};

export const SKIN_SEARCH_PARAM = "skin";
export const SECOND_SKIN_SEARCH_PARAM = "second-skin";

const useSkinsFromSearchParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const defaultFirstSkin = getSafeSkinUrl(searchParams.get(SKIN_SEARCH_PARAM));
  const defaultSecondSkin = getSafeSkinUrl(
    searchParams.get(SECOND_SKIN_SEARCH_PARAM)
  );

  const setSkinSearchParam = (searchParam: string, url: string | null) => {
    if (url) {
      searchParams.set(searchParam, url);
    } else {
      searchParams.delete(searchParam);
    }

    setSearchParams(searchParams);
  };

  return {
    defaultFirstSkin,
    defaultSecondSkin,
    setDefaultFirstSkin: (skin: string | null) =>
      setSkinSearchParam(SKIN_SEARCH_PARAM, skin),
    setDefaultSecondSkin: (skin: string | null) =>
      setSkinSearchParam(SECOND_SKIN_SEARCH_PARAM, skin),
  };
};

export default function ViewerParametersContext({
  children,
}: ViewerParametersContextProps) {
  const {
    defaultFirstSkin,
    defaultSecondSkin,
    setDefaultFirstSkin,
    setDefaultSecondSkin,
  } = useSkinsFromSearchParams();

  const [firstSkin, setFirstSkin] = useState<string | null>(defaultFirstSkin);
  const [secondSkin, setSecondSkin] = useState<string | null>(
    defaultSecondSkin
  );
  const [comparisonMode, setComparisonMode] = useState<ComparisonModeType>(
    defaultFirstSkin && defaultSecondSkin ? "side-by-side" : "off"
  );
  const [mobileView, setMobileView] = useState(false);
  const [activeSkin, setActiveSkin] = useState<"first" | "second">("first");

  useEffect(() => {
    function resizeHandle() {
      setMobileView(window.innerWidth < window.innerHeight);
    }

    resizeHandle();

    window.addEventListener("resize", resizeHandle, true);
    return () => window.removeEventListener("resize", resizeHandle);
  }, []);

  useEffect(() => {
    if (defaultFirstSkin !== firstSkin) {
      setFirstSkin(defaultFirstSkin)
    }

    if (defaultSecondSkin !== secondSkin) {
      setSecondSkin(defaultSecondSkin)
    }
  }, [defaultFirstSkin, defaultSecondSkin]);

  const setFirstSkinHandle = (url: string | null, updateUrl: boolean) => {
    if (updateUrl) setDefaultFirstSkin(url);
    setFirstSkin(getSafeSkinUrl(url));
  };

  const setSecondSkinHandle = (url: string | null, updateUrl: boolean) => {
    if (updateUrl) setDefaultSecondSkin(url);
    setSecondSkin(getSafeSkinUrl(url));
  };

  const defaultSkin = "/steve_pony.png";

  return (
    <Context.Provider
      value={{
        activeSkin,
        setActiveSkin,
        firstSkin: firstSkin ?? defaultSkin,
        secondSkin: secondSkin ?? defaultSkin,
        setFirstSkin: setFirstSkinHandle,
        setSecondSkin: setSecondSkinHandle,
        comparisonMode,
        setComparisonMode,
        mobileView,
        defaultSkin,
        isComparisonMode: comparisonMode === "on",
        isDefaultMode: comparisonMode === "off",
        isSideBySideMode: comparisonMode === "side-by-side",
      }}
    >
      {children}
    </Context.Provider>
  );
}

export const useViewerParameters = () => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Не задан ViewerParametersContext");
  }

  return context;
};
