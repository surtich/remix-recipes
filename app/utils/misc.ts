import { useLocation, useMatches } from "@remix-run/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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

export function useDebouncedFunction<T extends Array<any>>(
  fn: (...args: T) => unknown,
  time: number = 1000
) {
  const timeoutid = useRef<number>(); // if we use useState, it will trigger re-render everytime timtout id changes
  const deboundedFn = (...args: T) => {
    window.clearTimeout(timeoutid.current); // cancel the timeout and restart it when debouncedFn is called
    timeoutid.current = window.setTimeout(() => fn(...args), time); // we want to call this fn until debouncedFn hasn't been called for this amount of time
  };

  return deboundedFn;
}

export function useBuildSearchParams() {
  const location = useLocation(); // información de la URL actual

  // actualiza un search parameter de la URL
  return (name: string, value: string) => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set(name, value);
    return `?${searchParams.toString()}`;
  };
}
