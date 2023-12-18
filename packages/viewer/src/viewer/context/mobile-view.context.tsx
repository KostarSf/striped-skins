import { createContext, useContext, useEffect, useState } from "react";

const MobileViewContext = createContext(false);

export function MobileViewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    function isMobileHandle() {
      setMobile(
        window.innerWidth < 768 || window.innerWidth / window.innerHeight < 1.1
      );
    }

    isMobileHandle();

    window.addEventListener("resize", isMobileHandle);
    return () => window.removeEventListener("resize", isMobileHandle);
  }, []);

  return (
    <MobileViewContext.Provider value={mobile}>
      {children}
    </MobileViewContext.Provider>
  );
}

export const useIsMobileView = () => {
  return useContext(MobileViewContext);
};
