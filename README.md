# LuaMore — Luau Script Obfuscation & Security Platform

**LuaMore** is a complete, production-grade Luau / Roblox script security, hosting, and licensing suite. Built with high-performance polymorphic bytecode virtualization, dynamic license authentication, hardware fingerprinting (HWID locks), and live Discord slash command integrations.

---

## 🚀 Key Features

- **LuaMore VM v6 Virtualization Engine**:
  - Multilayer AST transforms, opcode virtualization, control flow flattening, and anti-tamper runtime checks.
  - Variable name mangling, string dynamic XOR decryptors, and number mutation.
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
npm install
```

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
- `npm run test:obfuscator` — Run self-test on the LuaMore VM v6 obfuscation pipeline

---

## 🔒 Owner Controls

Special administrator features (such as manual Discord slash command synchronization) are restricted to authorized owner accounts configured in `src/lib/site.ts`.

---

## 📄 License

MIT License. Created for script developers and creators.
