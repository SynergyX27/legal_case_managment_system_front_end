import { ThemeToggle } from "@/components/lf/theme-provider";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/lf/ui-bits";
import { UserFields, blankUser } from "@/components/lf/user-editor";
import { useStore } from "@/lib/store";
import { useStoreHydrated } from "@/lib/use-hydrated-store";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "LegalFlow — Your work, in order" }] }),
  component: Login,
});
function Login() {
  const ready = useStoreHydrated(),
    nav = useNavigate(),
    s = useStore();
  const [identity, setIdentity] = useState(""),
    [password, setPassword] = useState(""),
    [signup, setSignup] = useState(false),
    [draft, setDraft] = useState(() => blankUser()),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (ready && s.sessionUserId) nav({ to: "/dashboard" });
  }, [ready, s.sessionUserId, nav]);
  const changeMode = (create: boolean) => {
    if (busy) return;
    setSignup(create);
    setError("");
    setShow(false);
  };
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (await s.login(identity, password)) {
        nav({ to: "/dashboard" });
      } else
        setError(useStore.getState().connectionError || "That username or password doesn’t match.");
    } catch {
      setError("We couldn’t sign you in. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="entry-page photo-entry">
      <aside className="photo-entry-visual" aria-label="LegalFlow welcome">
        <img
          src="/images/legal-architecture-v1.png"
          alt="Contemporary courthouse-inspired architecture with stone columns and glass"
          className="photo-entry-image"
          fetchPriority="high"
        />
        <div className="photo-entry-shade" />
        <div className="photo-entry-brand">
          <Logo light />
          <span className="photo-entry-edition">THE LEGAL WORKSPACE</span>
        </div>
        <div className="photo-entry-copy">
          <p className="photo-entry-eyebrow">
            <span />
            CLARITY FOR EVERY CASE
          </p>
          <h1>
            Every detail.
            <br />
            Every deadline.
            <br />
            <span>One clear view.</span>
          </h1>
          <p className="photo-entry-description">
            Bring your cases, documents and conversations
            <br className="hidden xl:block" /> together. Make room for the work that matters.
          </p>
          <div className="photo-entry-features">
            <span>
              <FolderOpen />
              Case management
            </span>
            <span>
              <FileText />
              Documents
            </span>
            <span>
              <MessageCircle />
              Your team
            </span>
          </div>
        </div>
        <div className="photo-entry-visual-footer">
          <span>LegalFlow · Built around your cases.</span>
          <span className="photo-entry-scroll-mark">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </aside>
      <main className="photo-entry-main">
        <header className="photo-entry-top">
          <ThemeToggle />
          <div className="photo-mobile-logo">
            <Logo />
          </div>
          <span className="photo-entry-top-note">YOUR CASES. YOUR WORKSPACE.</span>
          <button
            className="photo-entry-switch"
            disabled={!ready || busy}
            onClick={() => changeMode(!signup)}
          >
            {signup ? "Already registered?" : "New here?"}{" "}
            <strong>{signup ? "Sign in" : "Create account"}</strong>
            <ArrowUpRight className="size-3.5" />
          </button>
        </header>
        <div className="photo-form-wrap">
          <section
            className={`entry-card ${signup ? "is-register" : ""}`}
            aria-labelledby="entry-form-title"
          >
            <div className="entry-mode-switch" aria-label="Account action">
              <button
                type="button"
                disabled={!ready || busy}
                aria-pressed={!signup}
                className={!signup ? "is-active" : ""}
                onClick={() => changeMode(false)}
              >
                Sign in
              </button>
              <button
                type="button"
                disabled={!ready || busy}
                aria-pressed={signup}
                className={signup ? "is-active" : ""}
                onClick={() => changeMode(true)}
              >
                Create account
              </button>
            </div>
            <div className="entry-form-heading">
              <span className="entry-form-kicker">
                {signup ? "CUSTOMER REGISTRATION" : "WELCOME TO LEGALFLOW"}
              </span>
              <h2 id="entry-form-title">{signup ? "Create your account." : "Welcome back."}</h2>
              <p>
                {signup
                  ? "Create your customer account and keep every case within reach."
                  : "Sign in to pick up right where you left off."}
              </p>
            </div>
            {s.connectionError && !error && (
              <p
                role="alert"
                className="mb-4 rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
              >
                {s.connectionError}
              </p>
            )}
            <form
              className="entry-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!signup) {
                  await submit();
                  return;
                }
                if (busy) return;
                setError("");
                if (draft.password !== draft.confirmPassword) {
                  setError("Your passwords don’t match. Please check them.");
                  return;
                }
                setBusy(true);
                try {
                  const error = await s.registerCustomer(draft);
                  if (error) setError(error);
                  else nav({ to: "/dashboard" });
                } catch {
                  setError("We couldn’t create your account. Please try again.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {signup ? (
                <UserFields value={draft} onChange={setDraft} />
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="identity">Username or email</Label>
                    <Input
                      id="identity"
                      required
                      autoComplete="username"
                      placeholder="Enter your username or email"
                      value={identity}
                      onChange={(e) => setIdentity(e.target.value)}
                      disabled={!ready || busy}
                    />
                  </div>
                  <div className="mt-5 space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        required
                        type={show ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        className="pr-12"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={!ready || busy}
                      />
                      <button
                        type="button"
                        disabled={!ready || busy}
                        className="entry-password-toggle"
                        aria-label={show ? "Hide password" : "Show password"}
                        onClick={() => setShow(!show)}
                      >
                        {show ? (
                          <EyeOff className="size-[17px]" />
                        ) : (
                          <Eye className="size-[17px]" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700"
                >
                  {error}
                </div>
              )}
              <Button type="submit" disabled={!ready || busy} className="entry-submit" size="lg">
                {busy ? "Please wait…" : signup ? "Create my account" : "Sign in"}
                <ArrowRight className="size-4" />
              </Button>
            </form>
            <p className="entry-account-prompt">
              {signup ? "Already part of LegalFlow?" : "Don’t have an account yet?"}{" "}
              <button type="button" disabled={!ready || busy} onClick={() => changeMode(!signup)}>
                {signup ? "Sign in" : "Create an account"}
              </button>
            </p>
          </section>
        </div>
        <footer className="photo-entry-footer">
          <span>© {new Date().getFullYear()} LegalFlow</span>
          <span>Case management, with clarity.</span>
        </footer>
      </main>
    </div>
  );
}
