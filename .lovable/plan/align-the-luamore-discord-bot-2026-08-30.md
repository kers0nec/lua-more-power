# Align the LuaMore Discord bot

## Command behavior

- Register exactly the 16 requested slash commands, with matching options for script IDs, panel IDs, users, durations, notes, FFA, and obfuscation mode.
- Update each interaction handler to resolve the requested script or panel, enforce ownership/owner-role/server-admin checks, and return the specified script, key, whitelist, blacklist, HWID, loader, setup, and help responses.
- Preserve `/login` as the account-linking mechanism without exposing it as one of the 16 primary commands; existing linked accounts continue to work.
- Use the existing scripts, panels, keys, whitelists, user bans, and HWID bans in the Lovable Cloud database—no reset or data loss.

## Panel and loader flow

- Keep the five interactive panel buttons and include project/access details in the embed.
- Generate keyed and FFA loader snippets against LuaMore’s current hosted loader route.
- Make `/whitelist` generate and bind a key, return a ready-to-run loader, and attempt a direct message without failing the command if DMs are closed.
- Make blacklist and reset operations script-scoped where the command includes a script ID.

## Bot identity and docs

- Upload the provided `</>` image as the Discord bot profile image using the configured bot token.
- Update the public commands page so it accurately documents all 16 commands and their actual arguments.
- Synchronize the standalone registration script with the server command definitions.

## Validation

- Run focused type/tests and verify the interaction endpoint still accepts Discord’s signed request contract.
- Register the final command set with Discord and confirm the returned command names/count.
- Query Discord’s bot identity endpoint to confirm the avatar update succeeded without exposing credentials.
