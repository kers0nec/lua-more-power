# LuaMore rebrand + KeyForge-style pages + 16-command bot

Adopt the layout/pages from the uploaded reference site, rebrand every mention to **LuaMore**, switch the theme to **dark blue + black**, use the uploaded `</>` icon as the brand image/favicon, and expand the Discord bot to the 16 commands you listed.

## Public pages (rebuilt to match reference layout)

Ported from the uploaded HTML, wording changed to LuaMore, no KeyForge references:

- `/` — hero + features + how-it-works (from `index.html`)
- `/features` — feature grid (from `features.html`)
- `/features/key-system-gui` — key system GUI showcase
- `/loading-screens` — loading GUI showcase
- `/login`, `/register` — dark-blue auth cards
- `/tos`, `/privacy` — legal pages

## Theme

Update `src/styles.css` tokens to dark blue + black:

- `--background` `#05070d`, elevated `#0a1120`
- `--primary` `#1e5fff` with `--primary-glow` `#3b82f6`
- Foreground white / muted `#8a95b2`
- Fonts: IBM Plex Sans (headings) + Source Sans 3 (body) via Google Fonts `<link>` in `__root.tsx`

## Brand image

- Save uploaded `</>` icon as a Lovable asset pointer in `src/assets/luamore-icon.png.asset.json`
- Replace `<Logo />` mark and the `<link rel="icon">` reference
- Overwrite `public/favicon.ico` with the same image

## Loader URL format

- Add new server routes `/scripts/hosted/$publicId.lua` and `/scripts/raw/$publicId.lua` that delegate to the existing loader logic
- Keep old `/api/public/r/*` alive as an alias so existing users don't break
- Update dashboard "Copy loader" snippets to the new `script_key = "..."` + hosted URL format

## Discord bot — 16 commands

Rewrite `src/lib/discord-commands.server.ts` to register all 16, wire handlers in `src/routes/api/public/discord/interactions.ts`:

| Command           | Backing action                                          |
| ----------------- | ------------------------------------------------------- |
| `/create-script`  | insert into `scripts` (name, code, ffa, obfuscate flag) |
| `/panel`          | post styled embed with 5 buttons in current channel     |
| `/generatekey`    | insert into `license_keys` (hours, note, optional user) |
| `/whitelist`      | insert into `whitelists` with duration parser           |
| `/blacklist`      | insert into `user_bans` scoped to script                |
| `/deletekey`      | delete a `license_keys` row you own                     |
| `/resethwid`      | clear `hwid` on your own keys                           |
| `/forceresethwid` | owner-only reset on any user's keys                     |
| `/banuser`        | owner-only `profiles.is_banned = true`                  |
| `/unbanuser`      | owner-only unban                                        |
| `/banhwid`        | insert `hwid_bans`                                      |
| `/unbanhwid`      | delete `hwid_bans` row                                  |
| `/loader`         | reply with hosted-URL loadstring for a script           |
| `/keys`           | list last 10 keys you generated                         |
| `/setup`          | short setup guide embed                                 |
| `/help`           | list of all commands                                    |

Panel embed matches the layout you showed (title, description, project, access, 5 buttons, "Sent by @owner").

## Out of scope for this pass

- Payments / plans UI (kept free as-is)
- Migrations for new tables — existing schema already covers everything above
- The KeyForge JS bundles (Next.js chunks) — we rebuild the layouts natively in TanStack Start rather than importing their bundles

Reply "go" and I'll build it.
