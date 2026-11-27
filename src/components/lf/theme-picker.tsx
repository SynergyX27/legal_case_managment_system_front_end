import { useState } from "react";
import { palettes, themeColors, type PaletteId } from "@/lib/themes";
import { useTheme } from "./theme-provider";
export function ThemePicker() {
  const { palette, theme, setPalette } = useTheme();
  const [draft, setDraft] = useState<PaletteId | null>(null),
    [notice, setNotice] = useState("");
  const selected = draft ?? palette;
  return (
    <div className="p-5 space-y-4">
      <p className="text-sm text-muted-foreground">
        Preview a color theme, then apply it. Your choice is saved for your account on this browser.
        Light/dark mode stays separate.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Color themes">
        {palettes.map((p) => {
          const c = themeColors(p.id, theme === "dark");
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={selected === p.id}
              onClick={() => {
                setDraft(p.id);
                setNotice("");
              }}
              className="rounded-xl border p-3 text-left"
              style={{
                borderColor: selected === p.id ? c.primary : undefined,
                boxShadow: selected === p.id ? `0 0 0 1px ${c.primary}` : undefined,
              }}
            >
              <div className="flex gap-2 mb-2">
                {[c.primary, c.secondary, c.highlight].map((color) => (
                  <span
                    key={color}
                    style={{ background: color, width: 22, height: 22, borderRadius: 7 }}
                  />
                ))}
              </div>
              <strong className="text-sm">
                {p.name}
                {palette === p.id ? " ✓" : ""}
              </strong>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </button>
          );
        })}
      </div>
      <ThemeSample id={selected} dark={theme === "dark"} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
          onClick={() => {
            setPalette(selected);
            setDraft(null);
            setNotice("Theme applied.");
          }}
        >
          Apply theme
        </button>
        <button
          type="button"
          className="rounded-full border px-4 py-2 text-sm font-semibold"
          onClick={() => {
            setDraft(null);
            setNotice("");
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-full border px-4 py-2 text-sm font-semibold"
          onClick={() => {
            setPalette("classic");
            setDraft(null);
            setNotice("Default theme restored.");
          }}
        >
          Restore default
        </button>
      </div>
      <p role="status" className="text-sm">
        {notice}
      </p>
    </div>
  );
}
function ThemeSample({ id, dark }: { id: PaletteId; dark: boolean }) {
  const c = themeColors(id, dark);
  return (
    <div
      aria-label="Theme sample preview"
      style={{
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        borderRadius: 16,
        overflow: "hidden",
        fontSize: 12,
      }}
    >
      <div style={{ background: c.card, padding: 12, borderBottom: `1px solid ${c.border}` }}>
        <b>LegalFlow · Sample preview</b>
      </div>
      <div style={{ display: "flex", minHeight: 190 }}>
        <div style={{ background: c.card, padding: 12, width: "28%", color: c.muted }}>
          <div style={{ color: c.primary, background: c.soft, padding: 7, borderRadius: 6 }}>
            Overview
          </div>
          <p>Case files</p>
          <p>File Manager</p>
        </div>
        <div style={{ padding: 14, flex: 1 }}>
          <b>Your workspace</b>
          <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
            {[c.primary, c.secondary, c.highlight].map((color, i) => (
              <div
                key={color}
                style={{
                  background: c.card,
                  border: `1px solid ${c.border}`,
                  borderTop: `3px solid ${color}`,
                  borderRadius: 7,
                  padding: 9,
                  flex: 1,
                }}
              >
                <b style={{ color }}>{[24, 8, 12][i]}</b>
                <div style={{ color: c.muted }}>Sample</div>
              </div>
            ))}
          </div>
          <div style={{ background: c.card, padding: 10, borderRadius: 7 }}>
            CASE-001 <span style={{ color: c.secondary }}> · Active</span>
          </div>
          <div
            style={{
              background: c.button,
              color: "white",
              padding: 8,
              borderRadius: 7,
              marginTop: 10,
              display: "inline-block",
            }}
          >
            View case
          </div>
        </div>
      </div>
    </div>
  );
}
