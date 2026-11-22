import { useEffect, useState, useSyncExternalStore } from "react";

export type ThemePref = "system" | "light" | "dark";
const KEY = "pico.theme";

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function useThemePref(): [ThemePref, (p: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(read);
  useEffect(() => {
    const root = document.documentElement;
    if (pref === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", pref);
    try {
      localStorage.setItem(KEY, pref);
    } catch {
      /* private mode */
    }
    window.dispatchEvent(new Event("pico-theme"));
  }, [pref]);
  return [pref, setPref];
}

const mq = () => window.matchMedia("(prefers-color-scheme: dark)");
function isDark() {
  const t = document.documentElement.getAttribute("data-theme");
  return t ? t === "dark" : mq().matches;
}
function subscribe(cb: () => void) {
  const m = mq();
  m.addEventListener("change", cb);
  window.addEventListener("pico-theme", cb);
  return () => {
    m.removeEventListener("change", cb);
    window.removeEventListener("pico-theme", cb);
  };
}
export const useIsDark = () => useSyncExternalStore(subscribe, isDark);
