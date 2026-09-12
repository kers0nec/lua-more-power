import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CodeXml, KeyRound, Bot, Link2, Copy, Check, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuaMore — Control who can run your Lua scripts" },
      {
        name: "description",
        content:
          "Free script hosting, license keys, HWID protection, Discord panels, and in-game loading bars. No card, no tiers — everything is free.",
      },
      {
        property: "og:title",
        content: "LuaMore — Control who can run your Lua scripts",
      },
      {
        property: "og:description",
        content:
          "Free script hosting, license keys, HWID protection, Discord panels, and in-game loading bars. No card, no tiers — everything is free.",
      },
      { property: "og:image", content: "https://luamore.app/brand/logo-text.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [publicId, setPublicId] = useState("");
  const [copied, setCopied] = useState(false);
  const normalizedPublicId = publicId.trim().replace(/\.lua$/i, "");
  const loaderPath = normalizedPublicId
    ? `/scripts/hosted/${encodeURIComponent(normalizedPublicId)}.lua`
    : "/scripts/hosted/<your-public-id>.lua";
  const loaderUrl =
    normalizedPublicId && typeof window !== "undefined"
      ? `${window.location.origin}${loaderPath}`
      : loaderPath;
  const loaderCode = normalizedPublicId
    ? `local loader = game:HttpGet("${loaderUrl}")\nloadstring(loader)()`
    : `-- Add a public ID from Dashboard → Scripts\nlocal loader = game:HttpGet("${loaderPath}")\nloadstring(loader)()`;

  const handleCopy = async () => {
    if (!normalizedPublicId) return;
    try {
      await navigator.clipboard.writeText(loaderCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleOpen = () => {
    if (!normalizedPublicId) return;
    window.open(loaderUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      <SiteNav />

      <main className="flex-1">
        {/* HERO — copied from uploaded index.html, now light-blue-themed */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 bg-gradient-hero" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="text-left">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3 py-1.5 text-[11px] font-bold text-primary backdrop-blur">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
                    aria-hidden="true"
                  />
                  Free forever · no card required
                </span>
                <h1 className="mt-6 max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                  Control who can run your <span className="text-gradient">Lua scripts.</span>
                </h1>
                <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-base">
                  Add a script, choose how access works — keys, Discord, ad links, or keyless — then
                  copy the loader. Everything is free, everything lives in one dashboard.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to="/auth"
                    className="btn-primary inline-flex h-11 items-center justify-center gap-2 rounded-md px-8 text-sm font-extrabold"
                  >
                    Create account <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="#how"
                    className="btn-outline inline-flex h-11 items-center justify-center gap-2 rounded-md px-8 text-sm font-extrabold"
                  >
                    How it works
                  </a>
                </div>
                <p className="mt-4 text-xs font-mono text-muted-foreground">
                  Unlimited projects · scripts · keys · obfuscations · loading screens
                </p>
              </div>

              {/* Real loader URL builder */}
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
                  <div>
                    <p className="font-mono text-xs font-bold text-foreground">loader builder</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Uses your actual public script ID
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!normalizedPublicId}
                    aria-label={copied ? "Loader copied" : "Copy loader"}
                    title={copied ? "Copied" : "Copy loader"}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-bold transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="border-b border-border bg-muted/20 px-4 py-4">
                  <label htmlFor="public-script-id" className="eyebrow">
                    Public script ID
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="public-script-id"
                      value={publicId}
                      onChange={(event) => {
                        setPublicId(event.target.value);
                        setCopied(false);
                      }}
                      className="input-blue min-w-0 font-mono text-xs"
                      placeholder="Paste the ID from Dashboard → Scripts"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={handleOpen}
                      disabled={!normalizedPublicId}
                      className="btn-outline shrink-0 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Open
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                    No sample IDs or keys are inserted. A loader is only valid after you create a
                    script in your workspace.
                  </p>
                </div>

                <pre
                  className="min-h-[140px] overflow-x-auto bg-[#05101a] p-5 font-mono text-[13px] leading-6 text-primary/90"
                  aria-label="Generated Lua loader"
                >
                  <code>{loaderCode}</code>
                </pre>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-3">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    GET {loaderPath}
                  </span>
                  <Link to="/auth" className="text-xs font-bold text-primary hover:underline">
                    Create a script first →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Truthful signed-out state */}
        <section className="mx-auto max-w-6xl px-6 py-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="eyebrow text-primary">Your workspace stays private</div>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
                  Real scripts and keys live in your dashboard.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  We do not show invented keys, run counts, or latency numbers here. Sign in to
                  manage the records that your loaders actually use.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link to="/auth" className="btn-outline text-xs">
                  Sign in
                </Link>
                <Link to="/auth" className="btn-primary text-xs">
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Four tools — from html #what */}
        <section id="what" className="mx-auto max-w-6xl px-6 py-12">
          <div className="text-center">
            <div className="eyebrow text-primary font-bold tracking-widest text-xs">
              The parts you actually use
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Four tools. One free dashboard.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                t: "Scripts",
                d: "Store a script, choose protection, and copy its loader in seconds.",
                icon: CodeXml,
              },
              {
                t: "Keys",
                d: "Create timed or permanent keys and bind them to a device.",
                icon: KeyRound,
              },
              {
                t: "Discord",
                d: "Post key panels and manage users with slash commands.",
                icon: Bot,
              },
              {
                t: "Ad links",
                d: "Give a key after a visitor completes your chosen link.",
                icon: Link2,
              },
            ].map((c) => {
              const I = c.icon;
              return (
                <div
                  key={c.t}
                  className="group rounded-2xl border border-border/60 bg-card p-6 text-left shadow-card transition-all hover:border-primary/40 hover:shadow-glow"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <I className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-extrabold">{c.t}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{c.d}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Setup steps — from html #how */}
        <section id="how" className="mx-auto max-w-6xl px-6 py-8">
          <div className="text-center">
            <div className="eyebrow text-primary font-bold tracking-widest text-xs">Setup</div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
              Four steps, then you are done
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "01",
                t: "Create a project",
                d: "Add the script you want to deliver.",
              },
              {
                n: "02",
                t: "Choose access",
                d: "Use keys, Discord, an ad link, or keyless mode.",
              },
              {
                n: "03",
                t: "Copy the loader",
                d: "Paste the loader where your users can find it.",
              },
              {
                n: "04",
                t: "Check activity",
                d: "See runs, errors, and active devices.",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-sm">
                  {s.n}
                </div>
                <h4 className="mt-4 font-extrabold">{s.t}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Free pricing — from html */}
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-8 shadow-card lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <div className="eyebrow text-primary font-bold tracking-widest text-xs">
                  Pricing — the short version
                </div>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
                  There is no pricing. Everything is free.
                </h2>
                <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                  No tiers, no card on file, no “trial ends soon”. Unlimited projects, scripts,
                  keys, obfuscations, and every loading preset — for everyone, forever.
                </p>
                <Link
                  to="/auth"
                  className="btn-primary mt-6 inline-flex h-11 items-center justify-center rounded-md px-8 font-extrabold"
                >
                  Get started — it’s free
                </Link>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="text-5xl font-black tracking-tight">
                  $0 <small className="text-sm font-bold text-muted-foreground">/mo · forever</small>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {[
                    "Unlimited projects, scripts & keys",
                    "Two obfuscation engines — LuaMore VM + 00fuscator",
                    "Full key system — HWID, durations, revocation",
                    "Discord panels & slash commands",
                    "Every loading-screen preset",
                  ].map((li) => (
                    <li key={li} className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" /> {li}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA — from html */}
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-card">
            <h2 className="text-3xl font-extrabold">Start with one project.</h2>
            <p className="mt-2 text-muted-foreground">It costs nothing, and it takes two minutes.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/auth"
                className="btn-primary inline-flex h-11 items-center justify-center rounded-md px-8 font-extrabold"
              >
                Create account
              </Link>
              <Link
                to="/features"
                className="btn-outline inline-flex h-11 items-center justify-center rounded-md px-8 font-extrabold"
              >
                Read the docs
              </Link>
            </div>
          </div>
        </section>

        {/* Small blue footer highlight */}
        <div className="mx-auto max-w-6xl px-6 pb-4 text-center text-xs text-muted-foreground">
          © 2026 LuaMore · More Power, More Security, More Lua —{" "}
          <span className="font-mono text-primary">light blue</span> edition ·{" "}
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" /> Protected By
            LuaMore Obfuscator
          </span>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
