# Bring the full KeyForge experience into LuaMore

## Goal

Replace the remaining older LuaMore presentation with a native LuaMore implementation of every usable page and visual pattern present in the latest uploaded KeyForge archive, while keeping LuaMore's existing working backend, authentication, loaders, scripts, keys, Discord panels, and routes.

## Public experience

- Rebuild the homepage to match the archive's compact product-led structure: navigation, hero, loader preview, four capability blocks, four-step setup, pricing/limits presentation adapted to LuaMore's free model, final call-to-action, and footer.
- Match the archive's typography, spacing, sharp bordered panels, dark navy/black palette, blue highlights, and responsive behavior.
- Bring the Features reference, loading-screen guide, key-system GUI guide, Terms, Privacy, login, and registration pages into the same visual system.
- Keep the LuaMore name, LuaMore icon, LuaMore URLs, and original copy rather than shipping KeyForge branding or compiled code.

## Dashboard experience

- Extend the same interface language across the authenticated sidebar, top bar, overview, scripts, script detail, obfuscator, keys, batches, HWID bans, Discord panels, API keys, and settings.
- Replace inconsistent legacy forms and cards with shared page headers, data panels, empty states, tables, badges, field styling, and responsive actions.
- Preserve all current data operations and backend behavior; this is a presentation and usability pass, not a database rewrite.
- Keep hosted loadstrings visible and copyable, and keep the existing script protection flow and progress state.

## Validation

- Verify every public route and primary dashboard route renders without console errors.
- Check desktop and mobile layouts for overflow, overlap, navigation behavior, and readable forms.
- Run the existing TypeScript checks and confirm loader/API routes still respond correctly.

## Technical notes

- Recreate the design from the uploaded HTML/assets in React/Tailwind; do not import the archive's compiled Next.js bundles or authentication internals.
- Consolidate repeated visual patterns into small shared components and semantic design tokens in the existing global stylesheet.
- Keep TanStack Start routing and Lovable Cloud integrations unchanged.
