import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Clock, Cpu, KeyRound, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { CopyCode } from "@/components/CopyCode";
import { DISCORD_INVITE } from "@/lib/site";

export const Route = createFileRoute("/keys")({
  head: () => ({
    meta: [
      { title: "Key System — LuaMore" },
      {
        name: "description",
        content:
          "Create and manage real LuaMore license keys, HWID bindings, expirations, and Discord delivery from your account.",
      },
    ],
  }),
  component: KeysPage,
});

function KeysPage() {
  return (
    <PageShell
      eyebrow="Authentication & Protection"
      title="Real key management, not a simulator"
      subtitle="Create, bind, inspect, and revoke license keys from your authenticated dashboard. This page explains the workflow without inventing credentials or pretending a browser-only check is a server validation."
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Clock,
            title: "Flexible Durations",
            desc: "Generate lifetime or expiring keys in the dashboard. Expiration is checked by the loader service.",
          },
          {
            icon: Cpu,
            title: "HWID Binding",
            desc: "Bind a key to the hardware identifier supplied by the executing environment and reset it when needed.",
          },
          {
            icon: Bot,
            title: "Discord Delivery",
            desc: "Connect your panel and use the supported Discord commands to deliver or revoke access.",
          },
          {
            icon: ShieldCheck,
            title: "Server Validation",
            desc: "License and script ownership checks run in the loader service before protected code is returned.",
          },
        ].map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="card-blue flex flex-col justify-between p-6">
              <div>
                <Icon size={22} style={{ color: "var(--primary)" }} />
                <h2 className="mt-4 font-display text-xl font-bold">{feature.title}</h2>
                <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {feature.desc}
                </p>
              </div>
              <span className="badge-blue mt-4 self-start">Available in dashboard</span>
            </div>
          );
        })}
      </div>

      <section className="card-blue mt-14 p-6 md:p-8">
        <div className="max-w-3xl">
          <div className="eyebrow text-primary">Your account is the source of truth</div>
          <h2 className="mt-2 font-display text-3xl">Manage real credentials</h2>
          <p className="mt-3 text-sm leading-7" style={{ color: "var(--muted-foreground)" }}>
            Keys belong to your account and can be tied to a script, panel, Discord user, note, and
            expiration. The public site cannot display those records while you are signed out, so
            the controls below take you to the real authenticated workflows.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/dashboard/keys" className="btn-primary">
              Open Key Manager
            </Link>
            <Link to="/login" className="btn-outline">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-center gap-4">
          <h2 className="eyebrow shrink-0">Loader template</h2>
          <div className="hairline" />
        </div>
        <p className="mt-3 max-w-2xl text-sm" style={{ color: "var(--muted-foreground)" }}>
          Use the loader copied from your script workspace. The placeholders below are deliberately
          not valid credentials or public IDs.
        </p>
        <div className="mt-5">
          <CopyCode
            label="loader-template.lua"
            code={`-- Paste the real key and public ID from your LuaMore dashboard
_G.script_key = "<license-key>"
local loader = game:HttpGet("https://your-domain/scripts/hosted/<public-id>.lua")
loadstring(loader)()`}
          />
        </div>
      </section>

      <section className="card-blue mt-14 p-6 md:p-8">
        <div className="flex items-center gap-3">
          <Bot size={24} style={{ color: "var(--primary)" }} />
          <div>
            <h2 className="font-display text-2xl">Discord commands</h2>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Manage the same account-backed key records from your connected Discord panel.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 font-mono text-xs sm:grid-cols-2 md:grid-cols-3">
          {[
            { cmd: "/createkey duration:<time>", desc: "Generate a key in the connected account" },
            { cmd: "/resethwid key:<key>", desc: "Clear the real HWID binding" },
            { cmd: "/keyinfo key:<key>", desc: "Read status and expiry from the service" },
            { cmd: "/revoke key:<key>", desc: "Revoke an existing credential" },
            { cmd: "/panel setup", desc: "Configure a self-serve panel" },
            { cmd: "/login <api_key>", desc: "Link the bot to your account" },
          ].map((command) => (
            <div
              key={command.cmd}
              className="space-y-1 rounded-lg border p-3"
              style={{ background: "var(--background)", borderColor: "var(--border)" }}
            >
              <div style={{ color: "var(--primary)" }} className="font-bold">
                {command.cmd}
              </div>
              <div className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                {command.desc}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            className="btn-outline flex items-center gap-2"
          >
            <Bot size={15} /> Join Discord Support
          </a>
          <Link to="/dashboard/keys" className="btn-primary">
            Open Key Manager
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
