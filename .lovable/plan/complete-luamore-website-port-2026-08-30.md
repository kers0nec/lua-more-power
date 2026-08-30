# Complete LuaMore website port

Port the full user-owned website archive into the current LuaMore application, rebuilding its visible interface natively in TanStack Start while preserving LuaMore’s existing working backend, dashboard, loaders, bot integration, and stored data.

## Public website

Recreate every user-facing page present in the uploaded archive and rebrand all copy and metadata to LuaMore:

- `/` — complete homepage structure, sections, responsive behavior, and calls to action
- `/features` — full feature overview
- `/features/key-system-gui` — key-system GUI showcase
- `/loading-screens` — loading-screen showcase
- `/login` and `/register` — matching authentication layout wired to the existing auth flow
- `/tos` and `/privacy` — complete legal layouts with LuaMore naming
- Shared navigation, mobile menu, footer, logo treatment, buttons, cards, typography, and transitions

## Visual system

- Use the uploaded `</>` image as the LuaMore logo and favicon
- Apply a cohesive dark navy and black theme throughout public pages, auth, and dashboard
- Recreate the archive’s spacing, hierarchy, panels, responsive layouts, and interaction polish without importing its compiled Next.js bundles
- Consolidate colors, borders, shadows, typography, and states into semantic global design tokens
- Remove unrelated decorative icon clutter while retaining icons that communicate actions

## Existing LuaMore product

Keep the current product capabilities and data intact, then align their presentation with the ported design:

- Dashboard shell and sidebar
- Scripts list and script detail/edit views
- Visible loadstring with one-click copy
- Protect-script action and progress state
- Keys, HWID, batches, panels, API keys, obfuscator, and settings pages
- Existing loader URLs, public API routes, Discord OAuth, slash commands, and database-backed behavior

## Integration and quality

- Adapt archive links to typed TanStack Router navigation
- Give each content route unique LuaMore metadata
- Keep current authentication and backend boundaries rather than copying captured third-party login pages or compiled JavaScript
- Verify desktop and mobile layouts, route navigation, auth screens, dashboard rendering, and key script/loadstring actions
- Resolve any type or runtime regressions introduced by the port

## Technical details

- Source reference: `www.keyforge.win-4.zip` and its static HTML/assets
- Framework target: TanStack Start + React 19 + Tailwind v4
- The archive’s Next.js runtime chunks and captured Google sign-in page will not be imported; equivalent first-party UI will be rebuilt against LuaMore’s existing flows
- Existing working routes beyond the archive will remain available and receive the same visual system
