import { useMatches } from "@remix-run/react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";

export function useMatchesData(id: string) {
  const matches = useMatches();
  const route = useMemo(
    () => matches.find((match) => match.id === id),
    [matches, id]
  );
  return route?.data;
}

export function isRunningOnServer() {
  return typeof window === "undefined";
}

export const useServerLayoutEffect = isRunningOnServer()
  ? useEffect
  : useLayoutEffect;

let hasHydrated = false;
export function useIsHydrated() {
  const [isHydrated, setIsHydrated] = useState(hasHydrated);

  useEffect(() => {
    // Sólo se hidrata una vez
    hasHydrated = true;
    setIsHydrated(true);
  }, []);

  return isHydrated;
}
