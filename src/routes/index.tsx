import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MessageSquare, ShieldCheck, Zap, CodeXml } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuaMore — Protect lua scripts" },
      {
        name: "description",
        content:
          "Create, obfuscate and host Luau scripts with a single loadstring loader URL.",
      },
      { property: "og:title", content: "LuaMore — Protect lua scripts" },
      {
        property: "og:description",
        content:
          "Create, obfuscate and host Luau scripts with a single loadstring loader URL.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const FEATURES = [
  {
    title: "Compiled, not patched",
    body: "A real lexer, parser and scope resolver renames and rewrites your Luau safely. Anything it cannot prove is left untouched.",
    icon: ShieldCheck,
  },
  {
    title: "Layered loader transport",
    body: "Every build is compressed, stream-encrypted and wrapped in self-contained Lua loader stages you can host anywhere.",
    icon: Zap,
  },
  {
    title: "One-line loader URL",
    body: "Each script gets a public loadstring endpoint you can copy and run in any Roblox executor.",
    icon: CodeXml,
  },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      <SiteNav />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 bg-gradient-hero" aria-hidden="true" />
          <div className="relative mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur sm:px-4 sm:text-xs">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              Luau obfuscation, made effortless
            </span>
            <h1 className="mt-8 text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
              Protect your Luau with a{" "}
              <span className="text-gradient">single loadstring</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-base text-muted-foreground sm:mt-7 sm:text-lg">
              Paste your script, choose your settings, hit create. LuaMore rewrites it
              into a protected loader URL ready to drop into any Roblox executor.
            </p>
            <div className="mt-10 flex justify-center gap-3 sm:mt-12">
              <Link
                to="/register"
                className="btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-md px-10 text-base font-extrabold"
              >
                Get Started <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="https://discord.gg/F2uYN9gWCk"
                target="_blank"
                rel="noreferrer"
                className="btn-outline inline-flex h-12 items-center justify-center gap-2 rounded-md px-8 text-base font-extrabold"
              >
                <MessageSquare className="h-4 w-4" /> Join Discord
              </a>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground font-mono">
              Local renaming, string encryption, control-flow flattening, layered loaders
            </p>
          </div>
        </section>

        {/* FEATURES */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-border/60 bg-card/80 p-5 text-left shadow-card backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:shadow-glow sm:p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 transition-colors duration-300 group-hover:bg-primary/25">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-bold text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
