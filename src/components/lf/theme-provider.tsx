import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
export type ThemeMode = "light" | "dark";
const THEME_KEY = "legalflow-theme";

const ThemeContext = createContext<{
  theme: ThemeMode;
  ready: boolean;
  setTheme: (theme: ThemeMode) => void;
}>({ theme: "light", ready: false, setTheme: () => {} });
function apply(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setMode] = useState<ThemeMode>("light"),
    [ready, setReady] = useState(false);
  useEffect(() => {
    const read = () => {
      let choice: string | null = null;
      try {
        choice = localStorage.getItem(THEME_KEY);
      } catch {}
      return choice === "dark" ||
        (choice !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark"
        : "light";
    };
    const update = () => {
      const next = read();
      setMode(next);
      apply(next);
    };
    update();
    setReady(true);
    const storage = (e: StorageEvent) => {
      if (e.key === THEME_KEY || e.key === null) update();
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const system = () => {
      let explicit = false;
      try {
        explicit = ["dark", "light"].includes(localStorage.getItem(THEME_KEY) ?? "");
      } catch {}
      if (!explicit) update();
    };
    window.addEventListener("storage", storage);
    media.addEventListener("change", system);
    return () => {
      window.removeEventListener("storage", storage);
      media.removeEventListener("change", system);
    };
  }, []);
  const setTheme = (next: ThemeMode) => {
    setMode(next);
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  };
  return (
    <ThemeContext.Provider value={{ theme, ready, setTheme }}>{children}</ThemeContext.Provider>
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
