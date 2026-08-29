# LuaMore — Build Plan

## Stack decisions

- **Frontend:** TanStack Start + React 19 + Tailwind v4, white background with blue accents defined as semantic tokens in `src/styles.css` (`--blue-primary`, `--blue-secondary`, `--blue-light`, etc.).
- **Backend:** Lovable Cloud (Postgres + RLS) instead of SQLite. All Larph API calls go through TanStack `createServerFn` (browser can't hit `http://` from HTTPS).
- **Auth:** Email/password + Discord OAuth (via Supabase provider) + API key (24-char, hashed at rest, used by loader scripts and CLI).
- **Discord:** HTTP interactions endpoint at `/api/public/discord/interactions` with Ed25519 signature verification. Handles all listed slash commands. No persistent gateway bot needed.
- **Loader endpoint:** `/api/public/loader/:publicId` returns the obfuscated script after HWID + key check.

## Design system (white + blue)

`src/styles.css` tokens:

```
--background: #ffffff;  --bg-secondary: #f5f9ff;  --bg-input: #f8faff;
--border: #d0e4ff;  --border-strong: #4d94ff;
--foreground: #1a2a3a;  --muted-foreground: #4a5a6a;
--primary: #00aaff;  --primary-hover: #0088dd;  --primary-dark: #0066cc;
--accent-light: #e8f4ff;
--shadow-card: 0 4px 20px rgba(0,100,200,0.08);
--shadow-hover: 0 8px 32px rgba(0,100,200,0.15);
```

Button variants: `primary` (blue bg / white text), `outline` (white bg / blue border), `ghost`. Card variant with blue border + shadow. All colors go through tokens — no hardcoded hex in components.

## Routes

Public:

- `/` — Homepage: hero, features (6), how-it-works (3 steps), stats, pricing (Free/Pro/Enterprise), footer
- `/demo` — Standalone obfuscation playground (calls Larph via server fn, no auth required for demo — rate-limited)
- `/auth` — Sign in / sign up (email + Discord)
- `/api/public/loader/$publicId` — Script loader (checks key + HWID → returns obfuscated code)
- `/api/public/discord/interactions` — Discord slash command webhook

Authenticated (`_authenticated/`):

- `/dashboard` — Overview + stats
- `/dashboard/scripts` — List, create, edit, obfuscate scripts
- `/dashboard/scripts/$id` — Detail: releases, obfuscation panel (Light/Standard/Advanced), download
- `/dashboard/obfuscate` — Standalone obfuscation tool
- `/dashboard/validate` — Syntax validator (Larph `/api/validate`)
- `/dashboard/keys` — License keys (list, generate, delete)
- `/dashboard/keys/batches` — Bulk generation up to 500
- `/dashboard/panels` — Discord panels (create, send)
- `/dashboard/hwid` — HWID bans + resets
- `/dashboard/api-keys` — Personal API keys
- `/dashboard/settings` — Discord link, profile
- `/dashboard/admin` — Owner-only user management

## Database schema (single migration)

```
profiles(id uuid pk → auth.users, email, display_name, discord_id, plan text default 'free',
         max_scripts int default 5, max_panels int default 5, is_owner bool default false,
         is_banned bool default false, created_at)
user_roles(id, user_id, role app_role)  -- has_role() SECURITY DEFINER
api_keys(id, user_id, key_hash, prefix, label, last_used_at, created_at)
scripts(id, user_id, name, public_id unique, code, obfuscated_code, obfuscator,
        larph_hash, is_protected bool, ffa bool, created_at, updated_at)
script_releases(id, script_id, user_id, obfuscated_code, obfuscator, larph_hash,
                is_protected, note, is_beta, version int, created_at)
panels(id, user_id, name, script_id, description, created_at)
license_keys(id, key unique, script_id, panel_id, user_id, discord_id, hwid,
             note, hours_valid int, expires_at, revoked bool, created_at)
key_batches(id, user_id, panel_id, size int, created_at)
hwid_bans(id, hwid unique, reason, banned_by, created_at)
user_bans(id, discord_id unique, reason, banned_by, created_at)
whitelists(id, script_id, discord_id, license_key_id, expires_at, created_at)
```

All tables: `GRANT`s for `authenticated` + `service_role`, RLS policies scoping to `auth.uid()` (owner role bypass via `has_role`).

## Larph integration

`src/lib/larph.server.ts`:

- `obfuscateWithLarph(code, { scramble, skidProtection })` → POST `${LARPH_API_URL}/api/obfuscate`
- `validateWithLarph(code)` → POST `${LARPH_API_URL}/api/validate`
- Reads `process.env.LARPH_API_URL` (default `http://78.154.103.2:9919`) inside handlers.
- Modes: `light` (scramble=false), `standard` (scramble=true), `advanced` (scramble=true + skidProtection=true).

Server functions in `src/lib/*.functions.ts`:

- `obfuscateScript({ scriptId, mode })`, `obfuscatePreview({ code, mode })`
- `validateSyntax({ code })`, `downloadObfuscated({ scriptId, mode })`
- `createScript`, `listScripts`, `updateScript`, `deleteScript`
- `generateKey`, `generateBatch`, `deleteKey`, `listKeys`
- `banHwid`, `unbanHwid`, `resetHwid`, `forceResetHwid`
- `whitelistUser`, `blacklistUser`, `banUser`, `unbanUser`
- `createPanel`, `listPanels`, `sendPanel` (POSTs embed to Discord webhook)

## Discord HTTP interactions

`/api/public/discord/interactions` (server route):

- Verify Ed25519 signature (`DISCORD_PUBLIC_KEY`) — reject if bad
- Handle PING (type 1) → PONG
- Dispatch slash commands: `/create-script`, `/login`, `/limits`, `/panel`, `/generatekey`, `/whitelist`, `/blacklist`, `/deletekey`, `/resethwid`, `/forceresethwid`, `/banuser`, `/unbanuser`, `/banhwid`, `/unbanhwid`, `/loader`, `/keys`, `/setup`, `/help`, `/validate`
- Each returns a blue-themed embed (`0x00aaff` success, `0xff4444` error, `0x0066cc` info, `0xffaa00` warn)
- User identity resolved via `discord_id` stored on `profiles` (linked at OAuth login) or `/login <api_key>`
- One-time `POST /api/public/discord/register-commands` (owner-only, called with header) to register commands with Discord

Panel buttons (Redeem Key / Get Script / Get Role / Reset HWID / Get Stats) handled as message component interactions in the same endpoint. Redeem opens a modal for key input.

## Secrets

Requested after backend is scaffolded:

- `LARPH_API_URL` (default provided, override optional)
- `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_GUILD_ID`, `OWNER_DISCORD_ID`
- `DISCORD_CLIENT_SECRET` for OAuth (also configured in Cloud Auth provider)

## Build order

1. Enable Lovable Cloud + design tokens in `styles.css`
2. Migration for all tables + RLS + `has_role`
3. Homepage `/` (hero, features, how-it-works, stats, pricing, footer) — replaces placeholder
4. Auth route (email + Discord)
5. Authenticated dashboard layout + sidebar
6. Larph server fns + Obfuscate + Validate + Demo pages
7. Scripts CRUD + releases + loader endpoint
8. Keys + batches + HWID bans
9. Panels + Discord interactions endpoint + command registration route
10. Admin page + polish + verify build

## Not included / caveats

- No persistent Discord gateway bot (impossible on Workers). Slash commands via HTTP webhook do everything you need including `/create-script` and `/validate`.
- Larph API is HTTP-only; if their server is unreachable from Cloudflare Workers egress, obfuscation will surface a clear error — nothing we can patch client-side.
- Discord bot token and public key must be added as secrets before slash commands work; I'll prompt for them at the right step.

Approve and I'll build straight through.
