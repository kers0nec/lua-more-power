# LuaMore — Luau Script Obfuscation & Security Platform

**LuaMore** is a complete, production-grade Luau / Roblox script security, hosting, and licensing suite. Built around a real Lua/Luau compiler front end (lexer → parser → AST → scope resolution → transforms → emitter), plus dynamic license authentication, hardware fingerprinting (HWID locks), and live Discord slash command integrations.

---

## 🚀 Key Features

- **LuaMore v7 obfuscation engine** (`src/lib/lua/`):
  - **Correctness first.** Every transform is guarded by a differential test suite: the original and the build are both executed in a Lua 5.3 VM over a 16-program corpus × 20 option combinations, and any difference in observable behaviour fails the run (`npm run test:engine`).
  - Lexical identifier renaming resolved through a real scope graph, so shadowed and same-named locals in different functions never collide. Built-in functions and Roblox globals (`game`, `Instance`, `workspace`, `script`, `LocalPlayer`, …) are preserved.
  - Encrypted string pools with a shuffled physical slot order, split numeric constants that preserve the integer/float class, opaque predicates and junk blocks.
  - Control-flow flattening into a shuffled state machine with unreachable states; loop `break`/`continue` are re-issued outside the dispatcher so they still bind to the real loop.
  - Runtime integrity shields, injected as a textual prelude (the engine only manipulates syntax — it never runs or evaluates your source):
    - `antiTamper` — arithmetic canaries + a self-checksum over the shield body and an optional payload-integrity checksum in the loader; fail-closed, silent while the environment is clean.
    - `antiHook` — pins the standard-library functions the payload depends on and fails closed if one was replaced or wrapped.
    - `antiLogger` — guarded environment for legacy Lua 5.1 executors (the only platform with `setfenv`) that blocks `getfenv`/`loadstring`/`debug` traps; inert on Luau/Roblox and Lua 5.2+.
  - Multi-layer transport: LZSS → stream cipher → base-85 with a per-build shuffled alphabet, djb2 payload integrity check, and 1–5 nested loader stages (`loaderVMDepth` / dual VM = depth ≥ 2, with each stage using its own cipher and alphabet). Pure TypeScript — no `zlib`, no Node builtins — so the same module runs on the server *and* in the browser.
  - Settings validation: `obfuscate(source, settings)` rejects unknown options, non-boolean switches, and `loaderVMDepth` outside 1–5 with clear errors. Everything is deterministic for a fixed seed.
  - Emits Lua 5.1–5.4 and Luau; anything it cannot prove safe is left untouched rather than broken.
  - **Obfuscation is not encryption.** It cannot make client-side secrets fully secure — it only raises the cost of tampering. Nothing in the engine collects telemetry, HWIDs, or fingerprints, and it adds no network calls or resource-exhaustion traps.
  - Known limitation: the differential tests run on fengari, whose integers are 32-bit (`math.maxinteger` is 2147483647), so constants above int32 are verified by exact evaluation of the emitted AST rather than by executing them.
- **License Key & Whitelist Management**:
  - Key creation with custom expiration, batch generation, activations counter, and automated whitelisting.
- **Hardware ID (HWID) Device Fingerprinting**:
  - One-click device locking, active HWID inspector, and self-service reset quotas.
- **Discord Bot & Interactive Panels**:
  - Real-time `/help`, `/login`, `/setup`, `/whitelist`, and `/resethwid` Discord interactions.
  - Interactive guild panels with customizable embeds, button callbacks, and script distribution.
- **Modern Dashboard & Developer Experience**:
  - Script versioning, public loaders (`loadstring(game:HttpGet(...))()`), analytics metrics, and REST API keys.
- **Interactive Loading Screen GUI & Luau Generator**:
  - 5 customizable presets (Modern Sapphire, Cyberpunk Neon, Minimal Dark, Glassmorphism, Matrix Glitch) with real-time preview and exportable Roblox Luau scripts.

---

## 🛠️ Tech Stack

- **Framework**: TanStack Start + React 19 + TypeScript
- **Styling**: Tailwind CSS with custom obsidian glass styling
- **Backend & Database**: TanStack Server Functions + Supabase
- **Icons & Animation**: Lucide React + Tailwind animations

---

## 📦 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/luamore.git
cd luamore
```

### 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

(`--legacy-peer-deps` is required: `@lovable.dev/vite-tanstack-config` declares a peer range that
conflicts with the installed React 19 / Vite versions.)

### 3. Environment Variables Setup

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
SUPABASE_PROJECT_ID=your-project-id
```

### 4. Run Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 🧪 Scripts & Commands

- `npm run dev` — Start the local development server on port 3000
- `npm run build` — Build production bundle
- `npm run preview` — Preview production build locally
- `npm run lint` — Run ESLint code checks
- `npm run format` — Format codebase with Prettier
- `npm run test:engine` — Full obfuscator suite (round-trip + transport + numbers + settings + differential + real-world)
  - `npm run test:roundtrip` — 19 parse → emit → reparse checks: the emitter must reproduce every corpus program, including Luau type syntax
  - `npm run test:pack` — transport property test: the emitted Lua loader must decode every payload back byte-for-byte
  - `npm run test:numbers` — numeric-transform property test: emitted expressions are re-parsed and evaluated exactly (BigInt, Lua 5.3 floor division and 64-bit bxor) for constants from 0 to 2^48, plus an end-to-end run over the range where the test VM is faithful
  - `npm run test:settings` — option validation (unknown keys, non-booleans, `loaderVMDepth` outside 1–5), `obfuscate()` shape, deterministic seeds, Roblox-global preservation, large sources, and fail-closed anti-tamper/anti-hook/anti env-logger behaviour
  - `npm run test:obfuscator` — the differential gate: original vs obfuscated, executed in fengari (Lua 5.3), must behave identically across every option combination including shield and loader-depth variants. Set `LUAMORE_TEST_SEED=<n>` to pin and replay one random build shape.
  - `npm run test:realworld` — the same differential gate run against the ~12 KB Roblox loading-screen scripts this project actually ships, under a stubbed Roblox API that records every read of an undefined global
- `npm run test:regression` — option combinations (including the legacy option names) obfuscated, executed and compared against the reference output

---

## 🔒 Owner Controls

Special administrator features (such as manual Discord slash command synchronization) are restricted to authorized owner accounts configured in `src/lib/site.ts`.

---

## 📄 License

MIT License. Created for script developers and creators.
