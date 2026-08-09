import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/api/docs")({
  head: () => ({
    meta: [
      { title: "API Docs — LuaMore Obfuscation API" },
      { name: "description", content: "Integrate LuaMore's LuaMore VM v4 obfuscation into your own whitelisting system with a single HTTP call." },
      { property: "og:title", content: "LuaMore API Docs" },
      { property: "og:description", content: "Obfuscate Lua on demand from your own backend or whitelisting system." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApiDocs,
});

const ENDPOINT = "https://luamore.app/api/public/obfuscate";

function Code({ children }: { children: string }) {
  return (
    <pre
      className="overflow-x-auto rounded-lg border p-4 text-xs leading-relaxed"
      style={{
        background: "var(--muted)",
        borderColor: "var(--border)",
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      }}
    >
      <code>{children}</code>
    </pre>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
      <div className="mt-4 space-y-4 text-sm" style={{ color: "var(--muted-foreground)" }}>
        {children}
      </div>
    </section>
  );
}

function ApiDocs() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      <main className="flex-1">
        <section
          className="relative overflow-hidden border-b"
          style={{ background: "var(--gradient-hero)", borderColor: "var(--border)" }}
        >
          <div className="grid-bg mask-fade pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto w-full max-w-5xl px-6 py-16 md:py-20">
            <div className="eyebrow">Developer API</div>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tighter md:text-6xl">
              Obfuscation API
            </h1>
            <p className="mt-5 max-w-2xl text-base" style={{ color: "var(--muted-foreground)" }}>
              Plug LuaMore VM v4 into your own whitelisting or key system. One POST
              request, back comes production-ready obfuscated Lua.
            </p>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-10 px-6 py-14 md:grid-cols-[200px_1fr]">
          <aside className="hidden md:block">
            <nav className="sticky top-24 flex flex-col gap-1 text-sm">
              <a href="#quickstart" className="text-muted-foreground hover:text-foreground">Quickstart</a>
              <a href="#auth" className="text-muted-foreground hover:text-foreground">Authentication</a>
              <a href="#obfuscate" className="text-muted-foreground hover:text-foreground">POST /obfuscate</a>
              <a href="#examples" className="text-muted-foreground hover:text-foreground">Examples</a>
              <a href="#errors" className="text-muted-foreground hover:text-foreground">Errors</a>
              <a href="#limits" className="text-muted-foreground hover:text-foreground">Limits</a>
            </nav>
          </aside>

          <div className="space-y-14">
            <Section id="quickstart" title="Quickstart">
              <p>
                Create an API key from{" "}
                <a href="/dashboard/api-keys" className="underline">Dashboard → API Keys</a>,
                then POST the Lua source you want protected to:
              </p>
              <Code>{`POST ${ENDPOINT}`}</Code>
              <p>The response returns the fully obfuscated Lua as a string.</p>
            </Section>

            <Section id="auth" title="Authentication">
              <p>Send your API key one of three ways (in order of preference):</p>
              <Code>{`Authorization: Bearer <YOUR_API_KEY>
# or
X-API-Key: <YOUR_API_KEY>
# or (JSON body field)
{ "api_key": "<YOUR_API_KEY>", "source": "..." }`}</Code>
              <p>Keys are hashed at rest. If a key leaks, delete it from the dashboard — deleted keys stop working instantly.</p>
            </Section>

            <Section id="obfuscate" title="POST /api/public/obfuscate">
              <p><strong>Request body</strong> (JSON):</p>
              <Code>{`{
  "source": "print('hello world')"
}`}</Code>
              <p><strong>Successful response</strong> (200):</p>
              <Code>{`{
  "ok": true,
  "obfuscated": "--[[ LuaMore VM v4 ... ]] local ...",
  "bytes_in": 21,
  "bytes_out": 138422,
  "engine": "LuaMore VM v4"
}`}</Code>
              <p>
                The <code>obfuscated</code> field is a self-contained Lua chunk. Serve it
                verbatim from your whitelisting endpoint — no wrapping required.
              </p>
            </Section>

            <Section id="examples" title="Examples">
              <p><strong>cURL</strong></p>
              <Code>{`curl -X POST ${ENDPOINT} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"source":"print(\\"hi\\")"}'`}</Code>

              <p><strong>Node.js (fetch)</strong></p>
              <Code>{`const res = await fetch("${ENDPOINT}", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${process.env.LUAMORE_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ source: userScript }),
});
const { obfuscated } = await res.json();
return new Response(obfuscated, { headers: { "Content-Type": "text/plain" } });`}</Code>

              <p><strong>Python</strong></p>
              <Code>{`import requests, os
r = requests.post("${ENDPOINT}",
  headers={"Authorization": f"Bearer {os.environ['LUAMORE_KEY']}"},
  json={"source": open("script.lua").read()})
print(r.json()["obfuscated"])`}</Code>

              <p><strong>Lua whitelisting server (example)</strong></p>
              <Code>{`-- Called by your loader after verifying the user's HWID/key.
local http = require("coro-http")
local json = require("json")

local res, body = http.request("POST", "${ENDPOINT}", {
  { "Authorization", "Bearer " .. LUAMORE_API_KEY },
  { "Content-Type", "application/json" },
}, json.encode({ source = SCRIPT_SOURCE }))

return json.decode(body).obfuscated`}</Code>
            </Section>

            <Section id="errors" title="Error responses">
              <p>All errors return JSON with an <code>error</code> field:</p>
              <Code>{`400  { "error": "missing 'source' string in body" }
401  { "error": "missing api key — send Authorization: Bearer <key>" }
401  { "error": "invalid api key" }
413  { "error": "source too large" }
500  { "error": "obfuscation failed" }`}</Code>
            </Section>

            <Section id="limits" title="Limits & notes">
              <ul className="list-disc space-y-1 pl-5">
                <li>Max source size: 1,000,000,000 characters.</li>
                <li>CORS is open (<code>*</code>) — safe to call from server or edge.</li>
                <li>Every call is billed to the owning API key; <code>last_used_at</code> is updated on success.</li>
                <li>Engine: triple-nested VM, 4× rotating XOR + RC4, keyed permutation, control-flow flattening, FNV-1a anti-tamper.</li>
                <li>Rebuild output on every call — each response is uniquely keyed.</li>
              </ul>
            </Section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
