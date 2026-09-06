# Panel-centric bot + execution logs + webhooks

## Database

- New `execution_logs` table: `id, user_id, script_id, license_key_id?, key?, hwid?, roblox_username?, roblox_user_id?, place_id?, ip?, created_at`. RLS: owners read own. Grants for authenticated + service_role.
- Index on `(user_id, created_at desc)` and `(script_id, created_at desc)`.
- No changes to `panels` (already has `webhook_url`, `channel_id`, `script_id`).

## Loader (`src/lib/loader.server.ts` + hosted `.lua` stub)

- Hosted stub now also captures `game:GetService("Players").LocalPlayer.Name` and `.UserId`, `game.PlaceId`, and passes `&user=&uid=&place=` alongside `&hwid=&key=`.
- On every successful serve: insert an `execution_logs` row with resolved `script_id`, matched `license_key_id`+`key`, `hwid`, `roblox_username`, `roblox_user_id`, `place_id`, and request IP (`cf-connecting-ip` / `x-forwarded-for`).
- If a `panel` is associated with the script (owner + script), and it has `webhook_url`, POST a Discord webhook embed with the same fields (fire-and-forget, ignore errors).

## Discord bot (`src/routes/api/public/discord/interactions.ts`)

- `/setup` (no args): requires linked account (`/login <api_key>`). Replies with ephemeral message + string-select of the user's scripts. Selecting one creates-or-reuses a panel bound to `(user, script, channel)` and posts the buyer panel in-channel. Same flow already exists as the `lm:setup` component; wire `/setup` to open the picker.
- `/generatekey` — remove `panel_id`. New optional `script_id`; if omitted, resolve panel from the current channel (`panels.channel_id = <channel>`). Errors if it can't infer.
- `/whitelist` — remove `script_id`. Same channel-panel inference; keeps `user` + optional `duration`. Sends buyer DM in the exact format:
  `« <@ID> » You have been whitelisted!`
  `You can access the script via this message --> https://discord.com/channels/<guild>/<channel_id>` (uses the panel's channel).
- `/blacklist` — remove `script_id`; infer from channel panel.
- `/loader` — keep script_id (user asks for their own loader).
- Panel embed rebuild: dark navy, `author = { name: sender_display, icon_url: sender avatar }`, `title = <script name>`, description = panel description or default, five buttons unchanged.

## Dashboard

- Panels page: expose a `webhook_url` text field on create/edit (schema field already exists) with help text "Discord webhook that receives an embed on every execution".
- New sidebar entry **Execution Logs** → `/dashboard/logs`: table with time, script, key (masked last 6), hwid (short), roblox username, place id, ip. Server fn `listExecutionLogs` returning last 200 for the owner.

## Verification

- `bunx tsgo --noEmit` clean.
- Manual: hit a keyed loader in browser; confirm a row appears in `execution_logs`; confirm webhook fires when panel has one.
