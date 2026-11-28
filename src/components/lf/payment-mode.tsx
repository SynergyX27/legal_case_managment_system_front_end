import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Config = { enabled: boolean; testMode: boolean };
export function PaymentMode({ settings = false }: { settings?: boolean }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () =>
      void api<Config>("/payments/config")
        .then((c) => {
          if (active) {
            setConfig(c);
            setError("");
          }
        })
        .catch(() => {
          if (active)
            setError("Payment mode could not be checked. Refresh before starting a payment.");
        });
    load();
    const timer = setInterval(load, 15000);
    window.addEventListener("legalflow-payment-mode", load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("legalflow-payment-mode", load);
    };
  }, []);
  async function change() {
    if (!config || busy) return;
    const mode = config.testMode ? "live" : "test";
    if (
      !window.confirm(
        mode === "live"
          ? "Enable LIVE payments? Customers will be charged real money using your company's live Stripe account."
          : "Enable TEST payments? New payments will use the Stripe sandbox. No real money will be charged. Test payments can mark test invoices Paid; use test invoices only.",
      )
    )
      return;
    setBusy(true);
    try {
      await api("/payments/mode", { method: "PUT", body: { mode } });
      setConfig(await api<Config>("/payments/config"));
      window.dispatchEvent(new Event("legalflow-payment-mode"));
      toast.success(
        mode === "live"
          ? "Live payments enabled — customers will be charged real money."
          : "Test payments enabled — no real money will be charged. Use test invoices only.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!settings)
    return error ? (
      <div role="alert" className="mb-4 rounded-xl border border-amber-500 bg-amber-500/15 p-4">
        {error}
      </div>
    ) : config?.testMode ? (
      <div
        role="status"
        className="mb-4 rounded-xl border-2 border-amber-500 bg-amber-500/15 p-4 text-sm"
      >
        <strong>TEST PAYMENT MODE ENABLED</strong> — Stripe sandbox is active. No real money will be
        charged. Use test invoices only.
        {!config.enabled && " Payments are unavailable until sandbox setup is complete."}
      </div>
    ) : null;
  return (
    <section className="rounded-xl border bg-card p-5 space-y-3">
      <h2 className="font-semibold">Stripe payment mode</h2>
      <p>
        {error ||
          (!config
            ? "Loading payment settings…"
            : config.testMode
              ? "Test mode: sandbox payments only. No real money is charged."
              : "Live mode: customers are charged real money.")}
      </p>
      <p className="text-sm text-muted-foreground">
        This company-wide setting applies to the website, public invoice links and mobile payments.
        Test payments can mark invoices Paid. Use test invoices only. Switching does not reset
        existing invoices.
      </p>
      {config && (
        <>
          <p>
            {config.enabled
              ? "Selected mode is configured."
              : "Selected mode is not configured. Ask your administrator to check the server's Stripe settings."}
          </p>
          <Button disabled={busy} onClick={change}>
            {busy
              ? "Saving…"
              : config.testMode
                ? "Disable test mode — use live payments"
                : "Enable test mode — use sandbox"}
          </Button>
        </>
      )}
    </section>
  );
}
