# Restore the full LuaMore dashboard and panel delivery

## Goal
Bring the authenticated dashboard fully into the KeyForge-inspired LuaMore design while preserving every existing script, source, key, panel, and account record, and make “Send to Discord” reliably post to the selected channel.

## Data and source recovery
- Keep the current Lovable Cloud tables and all existing records; do not reset or reseed user data.
- Treat the database as the source of truth. Remove reliance on the temporary local filesystem fallback, which is not durable in production and can make deleted or stale scripts reappear.
- Recover the old functionality and data inside the new dashboard: script source editor, uploads, metadata, FFA/access state, hosted loadstring with copy action, protect/save actions, release history, keys, and panels.
- Prevent accidental empty-source overwrites by disabling save until the script query has loaded successfully and by showing explicit loading, not-found, and save-error states.
- Preserve the 24 existing scripts that currently contain source and the 19 existing protected outputs. Clearly show an empty-source state for records whose original source is not present rather than inventing or replacing code.

## New KeyForge-inspired dashboard
- Replace the old dashboard presentation—not restore it—with a complete KeyForge-inspired interface branded as LuaMore.
- Apply one consistent dark navy/black dashboard system across overview, scripts, script detail, obfuscator, keys, batches, HWID bans, Discord panels, API keys, and settings.
- Rebuild the sidebar, page headers, compact stat blocks, bordered data panels, forms, empty states, badges, and responsive mobile navigation to closely match the reference experience.
- Keep the existing functionality and recovered records beneath the new interface; reproduce the reference’s layout language, not its compiled code or identity.

## Discord panel fix
- Rebuild the panel form so existing panels can edit and save name, description, attached script, channel ID, whitelist channel, buyer role, and admin roles.
- Remove the misleading webhook fallback from the dashboard because secure panel sending requires a bot-visible channel and permission verification.
- Validate Discord snowflake IDs and require an attached script plus channel before sending.
- Verify the signed-in account’s linked Discord identity and allow posting when that user is the server owner or has Administrator or Manage Channels permission.
- Improve Discord API error mapping for missing bot access, missing Send Messages/Embed Links permissions, invalid channels, and rate limits.
- Return the posted message/channel details and show a clear success state in the dashboard; refresh panel data after edits.
- Keep `/setup`-created panels editable from the website and ensure their destination fields stay synchronized.

## Validation
- Run TypeScript checks and focused server-function tests.
- Verify authenticated dashboard routes on desktop and mobile.
- Exercise source loading/saving without changing stored content.
- Test panel edits and the send flow through Discord, including permission and invalid-channel failure states.
- Verify hosted/raw loader routes and copyable loadstrings still work.
