import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MessageSquare } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuaMore — Protect lua scripts" },
      {
        name: "description",
        content:
          "Create, obfuscate and host Luau scripts with a single loadstring loader URL. You can also call it a free version of LuArmor.",
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
    title: "Obfuscated",
    body: "XOR-encoded payload with a runtime decoder.",
    icon: "shield-check",
  },
  {
    title: "Instant URL",
    body: "Each script gets a public loader endpoint.",
    icon: "zap",
  },
  {
    title: "One-line loader",
    body: "Copy a loadstring(...) snippet and run.",
    icon: "code-xml",
  },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      <SiteNav />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 bg-gradient-hero opacity-70" aria-hidden="true" />
          <div className="relative mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur sm:px-4 sm:text-xs">
              <span className="text-primary">●</span> Luau obfuscation, made effortless
            </span>
            <h1 className="mt-8 text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
              Snap your Luau into a{" "}
              <span className="text-gradient">loadstring</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-base text-muted-foreground sm:mt-7 sm:text-lg">
              Paste your script, name it, hit create. We obfuscate it and give you a one-line loader URL — ready to drop into any Roblox executor.
            </p>
            <div className="mt-10 flex justify-center gap-3 sm:mt-12">
              <Link
                to="/login"
                className="inline-flex h-10 items-center justify-center rounded-md bg-gradient-hero text-primary-foreground shadow-glow px-8 text-sm font-extrabold transition-all hover:opacity-90"
              >
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                href="https://discord.gg/F2uYN9gWCk"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-extrabold shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <MessageSquare className="mr-2 h-4 w-4" /> Join Discord
              </a>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border/60 bg-card/60 p-5 text-left shadow-card backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:shadow-glow sm:p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 transition-colors duration-300 group-hover:bg-primary/25">
                  <span className="text-primary text-lg">◆</span>
                </div>
                <h3 className="mt-4 font-bold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
