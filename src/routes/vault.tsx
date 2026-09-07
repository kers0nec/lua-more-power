import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Lock, ArrowRight, ShieldCheck, Database, Key } from "lucide-react";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Source Vault — LuaMore" },
      {
        name: "description",
        content: "Securely store, protect, and distribute your Luau source files with LuaMore.",
      },
    ],
  }),
  component: VaultPage,
});

function VaultPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteNav />
      <main className="flex-1">
        <section className="grid-lines border-b border-border/60 py-20 px-6">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              PROTECTED REPOSITORY
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Source Vault</h1>
            <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
              Your Luau scripts are stored encrypted at rest. Users only ever receive protected
              bytecode or dynamic VM stubs served through your custom loadstring.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/dashboard/scripts" className="btn-primary py-2.5 px-6 font-mono text-sm">
                Open Dashboard Vault <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
              <Link to="/auth" className="btn-outline py-2.5 px-6 font-mono text-sm">
                Sign in to manage
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-6">
              <Database className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-mono text-base font-semibold text-foreground">Zero Leaks</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Raw source code is never exposed to executor HTTP inspectors or public GitHub forks.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <Key className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-mono text-base font-semibold text-foreground">
                HWID Key Gated
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Deliver payloads only to authenticated players with valid hardware ID fingerprint
                licenses.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-mono text-base font-semibold text-foreground">
                LuaMore VM Shield
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Automated multi-layer VM obfuscation applied automatically before every payload
                release.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
