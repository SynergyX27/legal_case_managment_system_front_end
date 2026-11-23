import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
type Address = {
  residentAddress: string;
  unit: string;
  county: string;
  city: string;
  state: string;
  zip: string;
};
export function AddressSuggestions({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (v: Address) => void;
}) {
  const [rows, setRows] = useState<{ placeId: string; label: string }[]>([]),
    [error, setError] = useState("");
  const session = useRef(crypto.randomUUID()),
    version = useRef(0),
    selected = useRef(value);
  useEffect(() => {
    const n = ++version.current;
    if (value === selected.current || value.length < 3) {
      setRows([]);
      return;
    }
    const t = setTimeout(() => {
      api("/addresses/suggest", {
        method: "POST",
        body: { input: value, sessionToken: session.current },
      })
        .then((r) => {
          if (n === version.current) {
            setRows(r.suggestions);
            setError("");
          }
        })
        .catch(() => {
          if (n === version.current) {
            setRows([]);
            setError("Suggestions unavailable. You can enter the address manually.");
          }
        });
    }, 350);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div>
      <Input
        aria-label="Property address"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {rows.length > 0 && (
        <div
          className="mt-1 rounded-lg border bg-card p-1 shadow-lg"
          role="listbox"
          aria-label="Address suggestions"
        >
          {rows.map((r) => (
            <button
              type="button"
              role="option"
              aria-selected={false}
              key={r.placeId}
              className="block w-full rounded p-3 text-left text-sm hover:bg-accent"
              onClick={async () => {
                const n = ++version.current;
                try {
                  const a = await api("/addresses/details", {
                    method: "POST",
                    body: { placeId: r.placeId, sessionToken: session.current },
                  });
                  if (n !== version.current) return;
                  selected.current = a.residentAddress;
                  onSelect(a);
                  setRows([]);
                  session.current = crypto.randomUUID();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {r.label}
            </button>
          ))}
          <div className="px-3 py-2 text-right text-xs text-muted-foreground">Google Maps</div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-muted-foreground">{error}</p>}
    </div>
  );
}
