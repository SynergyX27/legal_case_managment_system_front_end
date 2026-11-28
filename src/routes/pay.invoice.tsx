import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  FileText,
  LockKeyhole,
  Printer,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import "@/styles/public-invoice.css";
export const Route = createFileRoute("/pay/invoice")({
  head: () => ({
    meta: [
      { title: "Your invoice" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: PublicInvoice,
});
type Line = {
  description: string;
  qty: number;
  price: number;
  serviceOutcome?: string;
  caseNumber?: string;
  reference?: string;
  tenant?: string;
  address?: string;
  unit?: string;
  serviceDate?: string;
};
type InvoiceView = {
  invoice: {
    number: string;
    date: string;
    dueDate: string;
    status: string;
    paidAt?: string;
    template: string;
    taxRate: number;
    lines: Line[];
    totals: { base: number; discount: number; net: number; tax: number; total: number };
  };
  company: {
    name: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    hasLogo: boolean;
  };
  customer: { name: string; company: string; address: string; email: string; phone: string };
  payment: { enabled: boolean; testMode: boolean };
};
const amount = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const date = (v: string) =>
  v
    ? new Date(v.length === 10 ? v + "T12:00:00" : v).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
export async function publicRequest(path: string, token: string, paymentMode?: string) {
  const r = await fetch(`/api/public/invoices/${path}`, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, ...(paymentMode ? { paymentMode } : {}) }),
    signal: AbortSignal.timeout(path === "pdf" ? 120000 : 45000),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || "Could not load your invoice. Please try again.");
  }
  return r;
}
export function PublicInvoice() {
  const [token, setToken] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get("token") || "",
  );
  const [data, setData] = useState<InvoiceView | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [logo, setLogo] = useState(""),
    [message, setMessage] = useState("");
  async function load(t = token) {
    if (!t) {
      setError("This invoice link is incomplete. Please request a new link from your case team.");
      return;
    }
    try {
      const d = await (await publicRequest("view", t)).json();
      setData(d);
      setError("");
      return d as InvoiceView;
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    const update = () => {
      setData(null);
      setLogo("");
      setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    if (!token) {
      setError("This invoice link is incomplete. Please request a new link from your case team.");
      return;
    }
    publicRequest("view", token)
      .then((r) => r.json())
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [token]);
  useEffect(() => {
    if (!data?.company.hasLogo) return;
    let active = true,
      url = "";
    publicRequest("logo", token)
      .then((r) => r.blob())
      .then((b) => {
        url = URL.createObjectURL(b);
        if (active) setLogo(url);
        else URL.revokeObjectURL(url);
      })
      .catch(() => {});
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [data?.company.hasLogo, token]);
  useEffect(() => {
    if (!token || !data || data.invoice.status === "Paid") return;
    let active = true,
      attempts = 0,
      running = false;
    const check = async () => {
      if (running || !active) return;
      running = true;
      try {
        const r = await (await publicRequest("status", token)).json();
        if (!active) return;
        if (r.status === "Paid") {
          await load();
          setMessage("Payment confirmed. Thank you!");
        } else if (new URLSearchParams(window.location.search).get("payment") === "success")
          setMessage("Your payment is being confirmed. This page will update automatically.");
      } catch (e) {
        if (active) setMessage((e as Error).message);
      } finally {
        running = false;
      }
    };
    const returning = new URLSearchParams(window.location.search).get("payment");
    if (returning === "success") void check();
    if (returning === "cancelled")
      setMessage("Checkout was cancelled. Your invoice remains unpaid.");
    const timer = setInterval(() => {
      if (++attempts <= 40 && returning === "success") void check();
    }, 3000);
    const focus = () => {
      void check();
    };
    window.addEventListener("focus", focus);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [token, data?.invoice.status]);
  async function pay() {
    setBusy("pay");
    setMessage("");
    try {
      const r = await (
        await publicRequest("checkout", token, data?.payment.testMode ? "test" : "live")
      ).json();
      if (r.paid) {
        await load();
        return;
      }
      const u = new URL(r.url);
      if (u.protocol !== "https:" || u.hostname !== "checkout.stripe.com")
        throw new Error("Could not open secure checkout");
      window.location.assign(u.href);
    } catch (e) {
      setMessage((e as Error).message);
      await load();
    } finally {
      setBusy("");
    }
  }
  async function download() {
    setBusy("pdf");
    try {
      const r = await publicRequest("pdf", token);
      const url = URL.createObjectURL(await r.blob()),
        a = document.createElement("a");
      a.href = url;
      a.download =
        r.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || "invoice.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const i = data?.invoice,
    t = i?.totals,
    paid = i?.status === "Paid";
  return (
    <div className="public-invoice">
      <header className="pi-top">
        <div className="pi-brand">
          <span className="pi-brand-icon">
            <FileText size={19} />
          </span>
          {data?.company.name || "LegalFlow"}
        </div>
        <span className="pi-private">
          <LockKeyhole size={13} />
          Private invoice
        </span>
      </header>
      {!data ? (
        <main className="pi-loading">
          <FileText size={34} />
          <h1>{error ? "Invoice unavailable" : "Opening your invoice…"}</h1>
          <p role={error ? "alert" : "status"}>
            {error || "Please wait while we retrieve the latest details."}
          </p>
          {token && <button onClick={() => load()}>Try again</button>}
        </main>
      ) : (
        <main className="pi-layout">
          <article className="pi-paper">
            <div className="pi-paper-head">
              <div>
                {logo ? (
                  <img className="pi-logo" src={logo} alt={data.company.name} />
                ) : (
                  <span className="pi-paper-brand">{data.company.name}</span>
                )}
                <p className="pi-overline">SERVICE INVOICE · {i!.template}</p>
              </div>
              <div className="pi-invoice-title">
                <span className={`pi-status ${paid ? "paid" : ""}`}>
                  {paid ? <Check size={13} /> : null}
                  {i!.status}
                </span>
                <h1>Invoice</h1>
                <p>{i!.number}</p>
              </div>
            </div>
            <div className="pi-parties">
              <section>
                <h2>From</h2>
                <strong>{data.company.name}</strong>
                <p>{data.company.address}</p>
                <p>{data.company.email}</p>
                <p>{data.company.phone}</p>
              </section>
              <section>
                <h2>Bill to</h2>
                <strong>{data.customer.company || data.customer.name}</strong>
                {data.customer.company !== data.customer.name && <p>{data.customer.name}</p>}
                <p>{data.customer.address}</p>
                <p>{data.customer.email}</p>
                <p>{data.customer.phone}</p>
              </section>
            </div>
            <div className="pi-dates">
              <div>
                <h2>Invoice date</h2>
                <p>{date(i!.date)}</p>
              </div>
              <div>
                <h2>Due date</h2>
                <p>{date(i!.dueDate)}</p>
              </div>
              <div>
                <h2>Currency</h2>
                <p>USD</p>
              </div>
            </div>
            <div className="pi-table-wrap">
              <table className="pi-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Service details</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {i!.lines.map((l, n) => (
                    <tr key={n}>
                      <td>{String(n + 1).padStart(2, "0")}</td>
                      <td>
                        <strong>{l.description}</strong>
                        <p>
                          CAS # {l.reference || "—"} · Case {l.caseNumber || "—"}
                        </p>
                        <p>
                          {l.tenant}
                          {l.unit ? ` · Unit ${l.unit}` : ""}
                        </p>
                        <p>{l.address}</p>
                        <p>
                          Service: {date(l.serviceDate || "")}
                          {l.serviceOutcome ? ` · ${l.serviceOutcome}` : ""}
                        </p>
                      </td>
                      <td>{l.qty}</td>
                      <td>{amount(Math.round(l.price * 100))}</td>
                      <td>{amount(Math.round(l.qty * l.price * 100))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pi-totals">
              {[
                ["Base price", t!.base],
                ["Discount", -t!.discount],
                ["Amount", t!.net],
                [`Tax (${i!.taxRate}%)`, t!.tax],
                ["Invoice total", t!.total],
              ].map(([k, v]) => (
                <div key={k}>
                  <span>{k}</span>
                  <strong>{amount(Number(v))}</strong>
                </div>
              ))}
              {paid && (
                <div>
                  <span>Amount paid</span>
                  <strong>{amount(t!.total)}</strong>
                </div>
              )}
              <div className="pi-balance">
                <span>Balance due</span>
                <strong>{amount(paid ? 0 : t!.total)}</strong>
              </div>
            </div>
            <div className="pi-note">
              <strong>
                {paid ? "Thank you for your payment." : "Thank you for your business."}
              </strong>
              <p>
                {paid
                  ? `Payment received${i!.paidAt ? " on " + date(i!.paidAt) : ""}. Your invoice is paid.`
                  : `Please pay by ${date(i!.dueDate)}. For billing questions, contact ${data.company.email || "your case team"}.`}
              </p>
            </div>
            <footer className="pi-paper-footer">
              Prepared by {data.company.name} · {i!.number}
            </footer>
          </article>
          <aside className="pi-actions">
            <section className="pi-payment-card">
              <span className="pi-overline">{paid ? "PAYMENT RECEIVED" : "AMOUNT DUE"}</span>
              <div className="pi-due">{amount(paid ? 0 : t!.total)}</div>
              <p>{paid ? "Your invoice is fully paid." : `Due ${date(i!.dueDate)}`}</p>
              {paid ? (
                <div className="pi-paid">
                  <Check size={18} />
                  Paid in full
                </div>
              ) : (
                <button
                  className="pi-pay"
                  onClick={pay}
                  disabled={!!busy || !data.payment.enabled || t!.total < 50}
                >
                  {busy === "pay" ? (
                    "Opening checkout…"
                  ) : (
                    <>
                      Pay invoice <ArrowRight size={17} />
                    </>
                  )}
                </button>
              )}
              {!paid && !data.payment.enabled && (
                <p className="pi-hint">Please contact your case team to arrange payment.</p>
              )}
              {data.payment.testMode && !paid && (
                <p className="pi-hint">Test mode. Use Stripe test payment details.</p>
              )}
              <span className="pi-secure">
                <ShieldCheck size={14} />
                Secure checkout with Stripe
              </span>
            </section>
            <section className="pi-tools">
              <button onClick={download} disabled={!!busy}>
                <Download size={16} />
                {busy === "pdf" ? "Preparing PDF…" : "Download PDF"}
              </button>
              <button onClick={() => window.print()} disabled={!!busy}>
                <Printer size={16} />
                Print invoice
              </button>
              <button
                onClick={async () => {
                  setBusy("refresh");
                  try {
                    await publicRequest("status", token);
                    await load();
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setBusy("");
                  }
                }}
                disabled={!!busy}
              >
                <RefreshCw size={16} />
                Refresh payment status
              </button>
            </section>
            {message && (
              <p role="status" className="pi-feedback">
                {message}
              </p>
            )}
            <p className="pi-link-note">
              <LockKeyhole size={13} />
              Keep this invoice link private. No account sign-in is required.
            </p>
          </aside>
        </main>
      )}
    </div>
  );
}
