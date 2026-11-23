import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
const fields = {
  companyName: "Company name",
  address: "Company address",
  phone: "Phone",
  email: "Email",
  website: "Website",
  coverTitle: "Cover title",
  coverText: "Cover letter text",
};
export function CompanyBranding() {
  const [v, setV] = useState<Record<string, string> | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/company/profile")
      .then(setV)
      .catch((e) => toast.error(e.message));
  }, []);
  if (!v) return <p>Loading company details…</p>;
  const save = async () => {
    setBusy(true);
    try {
      setV(await api("/company/profile", { method: "PATCH", body: v }));
      toast.success("Company details saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-xl border bg-card p-6 lg:col-span-2">
      <h2 className="mb-4 font-semibold">Company & report cover</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(fields).map(([k, label]) => (
          <label key={k} className="space-y-1 text-sm">
            <span>{label}</span>
            {k === "coverText" ? (
              <Textarea
                rows={5}
                value={v[k] || ""}
                onChange={(e) => setV({ ...v, [k]: e.target.value })}
              />
            ) : (
              <Input value={v[k] || ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
            )}
          </label>
        ))}
      </div>
      <p className="my-3 text-xs text-muted-foreground">
        Cover text placeholders: {"{community}, {address}, {caseNumber}, {clientName}, {refId}"}.
        Choose a case photo when generating its report.
      </p>
      {v["logoDocumentId"] && (
        <img
          className="my-3 max-h-20 max-w-48 object-contain"
          src={"/api/company/profile/logo?v=" + encodeURIComponent(v["updatedAt"] || "")}
          alt="Company logo"
        />
      )}
      <label className="block text-sm">
        Company logo (PNG / JPEG, up to 5 MB)
        <input
          className="my-2 block"
          type="file"
          accept="image/png,image/jpeg"
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 5 * 1024 * 1024) return toast.error("Choose a logo up to 5 MB");
            setBusy(true);
            try {
              const form = new FormData();
              form.append("file", f);
              const d = await api("/documents", { method: "POST", body: form });
              setV(
                await api("/company/profile", {
                  method: "PATCH",
                  body: { ...v, logoDocumentId: d.id },
                }),
              );
              toast.success("Logo updated");
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <div className="flex gap-2">
        <Button disabled={busy} onClick={save}>
          Save company details
        </Button>
        {v["logoDocumentId"] && (
          <Button
            disabled={busy}
            variant="outline"
            onClick={async () => {
              setBusy(true);
              try {
                setV(
                  await api("/company/profile", {
                    method: "PATCH",
                    body: { logoDocumentId: "", updatedAt: v["updatedAt"] },
                  }),
                );
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Remove logo
          </Button>
        )}
      </div>
    </section>
  );
}
