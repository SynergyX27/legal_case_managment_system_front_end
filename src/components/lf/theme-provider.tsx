import "@/styles/classic-theme.css";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
export type ThemeMode = "light" | "dark";
import { useStore } from "@/lib/store";
import { paletteId, themeColors, type PaletteId } from "@/lib/themes";
const ThemeContext = createContext<{
  theme: ThemeMode;
  palette: PaletteId;
  ready: boolean;
  setTheme: (v: ThemeMode) => void;
  setPalette: (v: PaletteId) => void;
}>({ theme: "light", palette: "classic", ready: false, setTheme: () => {}, setPalette: () => {} });
const tokenNames = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "border",
  "input",
  "ring",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "chart-1",
  "chart-2",
  "chart-3",
];
function apply(theme: ThemeMode, id: PaletteId) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  root.dataset["palette"] = id;
  tokenNames.forEach((k) => root.style.removeProperty(`--${k}`));
  if (id === "classic") return;
  const c = themeColors(id, theme === "dark");
  const tokens = {
    background: c.bg,
    foreground: c.text,
    card: c.card,
    "card-foreground": c.text,
    popover: c.card,
    "popover-foreground": c.text,
    primary: c.primary,
    "primary-foreground": theme === "dark" ? c.bg : "#ffffff",
    secondary: c.soft,
    "secondary-foreground": c.primary,
    muted: c.soft,
    "muted-foreground": c.muted,
    accent: c.soft,
    "accent-foreground": c.primary,
    border: c.border,
    input: c.border,
    ring: c.primary,
    sidebar: c.card,
    "sidebar-foreground": c.muted,
    "sidebar-primary": c.primary,
    "sidebar-primary-foreground": c.bg,
    "sidebar-accent": c.soft,
    "sidebar-accent-foreground": c.primary,
    "sidebar-border": c.border,
    "sidebar-ring": c.primary,
    "chart-1": c.primary,
    "chart-2": c.secondary,
    "chart-3": c.highlight,
  };
  Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(`--${k}`, v));
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const user = useStore((s) => s.sessionUserId),
    key = `legalflow-appearance:${user ?? "guest"}`;
  const [theme, setMode] = useState<ThemeMode>("light"),
    [palette, setPaletteState] = useState<PaletteId>("classic"),
    [ready, setReady] = useState(false);
  useEffect(() => {
    const update = () => {
      let data: any = {};
      try {
        data = JSON.parse(localStorage.getItem(key) ?? "{}");
      } catch {}
      let legacy: string | null = null;
      try {
        legacy = localStorage.getItem("legalflow-theme");
      } catch {}
      const mode = data.mode ?? legacy;
      const next: ThemeMode =
        mode === "dark" ||
        (mode !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches)
          ? "dark"
          : "light";
      const id = paletteId(data.palette);
      setMode(next);
      setPaletteState(id);
      apply(next, id);
      setReady(true);
    };
    update();
    const storage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) update();
    };
    window.addEventListener("storage", storage);
    return () => window.removeEventListener("storage", storage);
  }, [key]);
  const save = (mode: ThemeMode, id: PaletteId) => {
    setMode(mode);
    setPaletteState(id);
    apply(mode, id);
    try {
      localStorage.setItem(key, JSON.stringify({ mode, palette: id }));
    } catch {}
  };
  return (
    <ThemeContext.Provider
      value={{
        theme,
        palette,
        ready,
        setTheme: (v) => save(v, palette),
        setPalette: (v) => save(theme, paletteId(v)),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
export function ThemeToggle() {
  const { theme, ready, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      disabled={!ready}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      aria-pressed={theme === "dark"}
      onClick={() => setTheme(next)}
    >
      {theme === "dark" ? <Sun className="size-[17px]" /> : <Moon className="size-[17px]" />}
    </button>
  );
}
