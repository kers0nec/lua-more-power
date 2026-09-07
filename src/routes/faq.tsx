import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { ChevronDown, HelpCircle, Shield, KeyRound, Bot, Terminal, Zap } from "lucide-react";
import { DISCORD_SUPPORT, DISCORD_INVITE } from "@/lib/site";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Frequently Asked Questions | LuaMore" },
      {
        name: "description",
        content:
          "Frequently asked questions about LuaMore obfuscation, anti-hook protection, Discord panels, key systems, and executor compatibility.",
      },
    ],
  }),
  component: FaqPage,
});

interface FaqItem {
  q: string;
  a: string;
  category: "obfuscator" | "keys" | "discord" | "general";
}

const FAQS: FaqItem[] = [
  {
    category: "obfuscator",
    q: "How does the LuaMore Obfuscation & Anti-Hook Engine work?",
    a: "LuaMore utilizes a quad-layer encryption pipeline consisting of RLE bytecode compression, 4-round dynamic rotating XOR ciphers, RC4 stream encryption, and keyed PRNG permutations. The runtime includes a virtualized state-machine dispatcher with randomized opcodes, FNV-1a & djb2 dual integrity verification, and our signature Silent Entropy Poisoning anti-hook protection that stealthily corrupts decryption keys whenever debug hooks or C-closure interceptions are detected.",
  },
  {
    category: "obfuscator",
    q: "Which Roblox executors and Lua environments are supported?",
    a: "LuaMore scripts are tested and 100% compatible with all major executors including Wave, Solara, Synapse Z, Delta, Codex, Arceus X, Fluxus, KRNL, Celery, Swift, as well as standard Lua 5.1, LuaJIT, and Luau environments.",
  },
  {
    category: "obfuscator",
    q: "What anti-hook and anti-tamper mechanisms are built-in?",
    a: "Our engine verifies native C-closures for core functions (string.byte, string.char, table.concat, pcall, loadstring), string metatable index integrity, and detects function detours via debug.getinfo. If hooked, the engine poisons the internal PRNG entropy seed, resulting in garbage bytecode decryption for dumpers while preventing script memory extraction.",
  },
  {
    category: "keys",
    q: "How do license keys and HWID binding work?",
    a: "When an end user executes your script with a license key, LuaMore securely validates the key against our backend. On first run, the user's hardware identifier (HWID) is permanently linked. Subsequent executions from unauthorized devices are blocked automatically until you or your Discord bot resets their HWID.",
  },
  {
    category: "keys",
    q: "Can I create keyless (Free-For-All) scripts?",
    a: "Yes! You can toggle the FFA (Free-For-All) mode on any script. Keyless scripts can be loaded directly with loadstring(game:HttpGet('https://luamore.app/api/public/r/YOUR_ID'))() without requiring a key.",
  },
  {
    category: "discord",
    q: "How do I setup the LuaMore Discord Bot in my server?",
    a: "Simply invite the bot via the Discord invite link, or link your LuaMore account via `/login <api_key>` in Discord. You can post interactive script delivery panels using `/panel post <script_id>` and grant keys using `/keys create` directly in Discord.",
  },
  {
    category: "discord",
    q: "Can my Discord moderators reset user HWIDs or grant timed keys?",
    a: "Yes. Server administrators and configured moderators can execute `/hwid reset`, `/keys create duration:30d`, and manage user whitelists straight from your Discord server channels.",
  },
  {
    category: "general",
    q: "Is LuaMore free to use?",
    a: "Yes, LuaMore is completely free with unlimited script hosting, key generation, Discord bot panels, and obfuscation runs.",
  },
  {
    category: "general",
    q: "How fast is script loading from the CDN?",
    a: "Our global edge network caches and delivers obfuscated payloads in under 35ms with 99.99% uptime, ensuring zero in-game lag or hang times for your players.",
  },
];

function FaqPage() {
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [search, setSearch] = useState("");

  const filtered = FAQS.filter((item) => {
    const matchesCat = selectedCat === "all" || item.category === selectedCat;
    const matchesSearch =
      !search.trim() ||
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <PageShell
      eyebrow="Help & Documentation"
      title="Frequently Asked Questions"
      subtitle="Everything you need to know about LuaMore obfuscation, anti-hook shields, key systems, and Discord bot integration."
    >
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search questions or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-blue pl-4 pr-10 py-3 text-base"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All Questions", icon: HelpCircle },
            { id: "obfuscator", label: "Obfuscator & Anti-Hook", icon: Shield },
            { id: "keys", label: "Keys & HWID", icon: KeyRound },
            { id: "discord", label: "Discord Bot", icon: Bot },
            { id: "general", label: "General & Free Access", icon: Zap },
          ].map((cat) => {
            const Icon = cat.icon;
            const active = selectedCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all ${
                  active
                    ? "bg-[color:var(--primary)] text-white shadow-md shadow-lime-500/20"
                    : "bg-[color:var(--card)] text-[color:var(--muted-foreground)] border border-[color:var(--border)] hover:border-[color:var(--primary)] hover:text-white"
                }`}
              >
                <Icon size={14} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="card-flat p-8 text-center" style={{ color: "var(--muted-foreground)" }}>
              No questions found matching &quot;{search}&quot;. Join our{" "}
              <a
                href={DISCORD_SUPPORT}
                target="_blank"
                rel="noreferrer"
                className="text-[color:var(--primary)] underline"
              >
                Discord support
              </a>{" "}
              for assistance.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-xl border transition-colors"
                  style={{
                    borderColor: isOpen ? "var(--primary)" : "var(--border)",
                    background: "var(--card)",
                  }}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left font-medium transition-colors"
                    style={{ color: "var(--foreground)" }}
                  >
                    <span className="text-base font-semibold">{item.q}</span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 transition-transform duration-200 ${
                        isOpen
                          ? "rotate-180 text-[color:var(--primary)]"
                          : "text-[color:var(--muted-foreground)]"
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div
                      className="border-t px-5 pb-5 pt-3 text-sm leading-relaxed"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Support Callout */}
        <div
          className="card-blue mt-12 flex flex-col items-center justify-between gap-6 p-6 sm:flex-row"
          style={{ background: "linear-gradient(135deg, #0a172e 0%, #040a15 100%)" }}
        >
          <div>
            <h3 className="font-display text-lg font-semibold text-white">Still have questions?</h3>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Our developer community is active 24/7 in the official Discord server.
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noreferrer"
              className="btn-primary shrink-0"
            >
              Join Discord
            </a>
            <Link to="/how" className="btn-outline shrink-0">
              Read Docs
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
