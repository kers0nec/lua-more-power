# LuaMore: Advanced Script Obfuscation

Create a complete Lua script obfuscation and hosting platform called "LuaMore" that uses the Larph API as its core obfuscation engine. This is a full production-ready system with web dashboard, license key management, HWID protection, whitelist system, and Discord integration. The theme should be WHITE with blue accents (clean, modern, professional).

## BRANDING

- Name: LuaMore

- Colors: WHITE background with blue accents (#ffffff, #00aaff, #0066cc, #e8f4ff)

- Logo: "LM" or "LuaMore" in blue with white background

- Tagline: "More Power, More Security, More Lua"

## COLOR SCHEME (WHITE with Blue Accents)

--bg-primary: #ffffff

--bg-secondary: #f5f9ff

--bg-card: #ffffff

--bg-input: #f8faff

--border: #d0e4ff

--border-blue: #4d94ff

--text-primary: #1a2a3a

--text-secondary: #4a5a6a

--text-muted: #8a9aaa

--blue-primary: #00aaff

--blue-secondary: #0066cc

--blue-dark: #003366

--blue-light: #e8f4ff

--blue-glow: rgba(0, 170, 255, 0.15)

--accent: #00aaff

--accent-hover: #0088dd

--shadow: 0 8px 40px rgba(0, 100, 200, 0.1)

--shadow-hover: 0 12px 48px rgba(0, 100, 200, 0.18)

## HOMEPAGE DESIGN (WHITE BACKGROUND)

### Hero Section:

- Large "LuaMore" logo in blue

- Subtitle: "More Power, More Security, More Lua"

- CTA Buttons: "Get Started" (blue) and "View Demo" (outline blue)

- Background: Pure white with subtle blue gradient overlay at top

- Clean, modern, professional design

- Large hero image or illustration

### Features Section:

1. "Larph Obfuscation" - Advanced Luau obfuscation engine

2. "License Management" - Generate and manage keys

3. "HWID Protection" - Hardware ID locking

4. "Panel System" - Interactive Discord panels

5. "Whitelist System" - Auto-generate keys on whitelist

6. "Script Hosting" - Host and manage Lua scripts

### How It Works (3 Steps):

1. Upload your Luau script

2. Obfuscate with Larph API

3. Deploy with Discord integration

### Stats Section:

- Scripts Obfuscated: X

- Active Users: X

- Keys Generated: X

- Scripts Hosted: X

### Pricing/Plans:

- Free: 5 scripts, basic obfuscation

- Pro: 50 scripts, advanced obfuscation

- Enterprise: Unlimited, priority support

### Footer:

- LuaMore logo

- Links: Home, Dashboard, Commands, Support

- Social links: Discord, GitHub, Twitter

- Copyright: © 2024 LuaMore

## LARPH API INTEGRATION (MUST USE THIS EXACT IMPLEMENTATION)

### Larph API Base URL:

http://78.154.103.2:9919

### Larph API Endpoints:

1. POST /api/validate - Syntax validation

2. POST /api/obfuscate - Full obfuscation

### Core Obfuscation Function:

async function obfuscateWithLarph(code, options = { scramble: true, skidProtection: false }) {

  try {

    const response = await fetch('http://78.154.103.2:9919/api/obfuscate', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({

        code: code,

        options: {

          scramble: options.scramble !== false,

          skidProtection: options.skidProtection === true

        }

      })

    });

    if (!response.ok) {

      const errorData = await response.json();

      throw new Error(errorData.error || 'Larph obfuscation request failed');

    }

    const data = await response.json();

    return {

      output: data.output,

      protected: data.protected,

      hash: data.hash

    };

  } catch (error) {

    console.error('Larph API error:', error);

    throw error;

  }

}

### Validation Function:

async function validateWithLarph(code) {

  try {

    const response = await fetch('http://78.154.103.2:9919/api/validate', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ code: code })

    });

    if (!response.ok) {

      const errorData = await response.json();

      throw new Error(errorData.error || 'Syntax validation failed');

    }

    return { valid: true };

  } catch (error) {

    return { valid: false, error: error.message };

  }

}

### Obfuscation Modes:

1. Standard (scramble: true, skidProtection: false): Control-flow scrambling + variable renaming

2. Advanced (scramble: true, skidProtection: true): Full obfuscation with server-side hosting (returns loader stub)

3. Light (scramble: false, skidProtection: false): Basic obfuscation without scrambling

### Larph API Error Handling:

- 400 SYNTAX_ERROR: Luau code has syntax error

- 422 MISSING_CODE: Code field is absent or empty

- 429 RATE_LIMITED: Too many requests (0.1s cooldown)

- 500 INTERNAL_ERROR: Server error during obfuscation

### Rate Limiting:

- Obfuscate endpoint: 0.1 second cooldown per IP

- Validate endpoint: More generous, designed for debounced input

## OBFUSCATION API ENDPOINTS

### 1. Obfuscate Existing Script

app.post('/api/obfuscate-script', requireAuth, async (req, res) => {

  const { scriptId } = req.body;

  const mode = req.body.mode || 'standard';

  

  const script = db.prepare('SELECT * FROM scripts WHERE id = ? AND user_id = ?').get(scriptId, req.session.user.id);

  if (!script) return res.status(404).json({ error: 'Script not found' });

  try {

    const options = {

      scramble: mode !== 'light',

      skidProtection: mode === 'advanced'

    };

    

    const result = await obfuscateWithLarph(script.code || '', options);

    const obfuscatedCode = result.output;

    

    db.prepare(`UPDATE scripts SET obfuscated_code = ?, obfuscator = ?, compress_mode = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)

      .run(obfuscatedCode, `larph-${mode}`, scriptId);

    createScriptRelease({ 

      scriptId, 

      userId: req.session.user.id, 

      obfuscatedCode, 

      obfuscator: `larph-${mode}`,

      larphHash: result.hash,

      isProtected: result.protected

    });

    res.json({ success: true, obfuscatedCode, protected: result.protected, hash: result.hash });

  } catch (error) {

    res.status(500).json({ error: `Obfuscation failed: ${error.message}` });

  }

});

### 2. Obfuscate Preview (Standalone Tool)

app.post('/api/obfuscate-preview', requireAuth, async (req, res) => {

  const code = String(req.body.code || '');

  const mode = req.body.mode || 'standard';

  

  if (!code.trim()) return res.status(400).json({ error: 'Code is required' });

  try {

    const options = {

      scramble: mode !== 'light',

      skidProtection: mode === 'advanced'

    };

    

    const result = await obfuscateWithLarph(code, options);

    res.json({ 

      success: true, 

      obfuscatedCode: result.output,

      protected: result.protected,

      hash: result.hash

    });

  } catch (error) {

    res.status(500).json({ error: `Obfuscation failed: ${error.message}` });

  }

});

### 3. Validate Syntax

app.post('/api/validate-syntax', requireAuth, async (req, res) => {

  const code = String(req.body.code || '');

  if (!code.trim()) return res.status(400).json({ error: 'Code is required' });

  try {

    const result = await validateWithLarph(code);

    res.json({ success: true, valid: result.valid });

  } catch (error) {

    res.status(500).json({ error: `Validation failed: ${error.message}` });

  }

});

### 4. Obfuscate and Download

app.post('/api/scripts/:id/obfuscate-download', requireAuth, async (req, res) => {

  const { id } = req.params;

  const mode = req.body.mode || 'standard';

  

  const script = db.prepare('SELECT * FROM scripts WHERE id = ? AND user_id = ?').get(id, req.session.user.id);

  if (!script) return res.status(404).json({ error: 'Script not found' });

  try {

    const options = {

      scramble: mode !== 'light',

      skidProtection: mode === 'advanced'

    };

    

    const result = await obfuscateWithLarph(script.code, options);

    const obfuscatedText = result.output;

    db.prepare(`UPDATE scripts SET obfuscated_code = ?, obfuscator = ?, compress_mode = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)

      .run(obfuscatedText, `larph-${mode}`, id);

    createScriptRelease({ 

      scriptId: id, 

      userId: req.session.user.id, 

      obfuscatedCode: obfuscatedText, 

      obfuscator: `larph-${mode}`,

      larphHash: result.hash,

      isProtected: result.protected,

      note: `${mode === 'advanced' ? 'Advanced (with skid protection)' : mode === 'standard' ? 'Standard' : 'Light'} obfuscation via Larph API`

    });

    const safeName = (script.name || 'script').replace(/[^a-z0-9_-]+/gi, '_');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_obfuscated.lua"`);

    res.send(obfuscatedText);

  } catch (error) {

    res.status(500).json({ error: `Obfuscation failed: ${error.message}` });

  }

});

## DISCORD BOT COMMANDS

### Bot Configuration:

DISCORD_TOKEN = YOUR_DISCORD_BOT_TOKEN

CLIENT_ID = YOUR_OAUTH_CLIENT_ID

CLIENT_SECRET = YOUR_OAUTH_SECRET

GUILD_ID = YOUR_SERVER_ID

### Complete Bot Commands List:

/create-script <name> [code] [ffa] [obfuscate] [mode] - Create a new script via Discord

/login <api_key> - Validate API key and show limits

/limits - Check your script and panel limits

/panel <panel_id> - Send a panel to the current Discord channel

/generatekey <panel_id> <hours> [note] [user] - Generate a license key

/whitelist <script_id> <user> [duration] - Whitelist a user and auto-generate key

/blacklist <script_id> <user> - Blacklist a user from a script

/deletekey <key> - Delete a license key

/resethwid <script_id> - Reset your linked HWID

/forceresethwid <script_id> <user> - Force reset HWID for a user

/banuser <discord_id> [reason] - Blacklist from website access

/unbanuser <discord_id> - Remove website blacklist

/banhwid <hwid> [reason] - Ban a hardware ID

/unbanhwid <hwid> - Remove a hardware ID ban

/loader <script_id> - Get the loader for a script

/keys [panel_id] - List your recent license keys

/setup - Set up the LuaMore panel

/help - List all available commands

/validate <code> - Validate Lua syntax using Larph API

### /create-script Command Implementation:

/create-script <name> <code> [ffa] [obfuscate] [mode]

Parameters:

- name: The name of the script (required)

- code: The Lua code to upload (required, can be attached as file or pasted)

- ffa: Set to true for FFA mode (optional, default: false)

- obfuscate: Set to true to auto-obfuscate (optional, default: false)

- mode: standard/advanced/light (optional, default: standard)

Usage Examples:

/create-script "My Script" "print('Hello World')" ffa:true obfuscate:true mode:advanced

/create-script "Protected Script" "local x = 1" obfuscate:true mode:standard

## DISCORD EMBED COLORS

- Success: #00aaff (blue)

- Error: #ff4444 (red)

- Info: #0066cc (dark blue)

- Warning: #ffaa00 (yellow)

## DASHBOARD PAGES (WHITE with Blue Accents)

### Navigation:

- Logo: "LuaMore" in blue

- Sidebar with blue active states

- Clean white background with blue accents

- Blue gradient on active nav items

### 1. Scripts Page

- White cards with blue borders

- Blue accent buttons

- Script cards with blue shadows on hover

- Obfuscation panel with Larph API options

- Create script form with blue submit button

### 2. Releases Page

- Version history with blue badges

- Beta status in blue

- Revert button in blue

### 3. Obfuscate Page

- Blue "Obfuscate" button

- Blue output highlighting

- Larph API mode selector (Light/Standard/Advanced)

- Blue accent on focus

### 4. Panels Page

- Blue panel preview

- Blue buttons matching Discord embed

- Blue accent on panel cards

### 5. Keys Page

- Blue "Generate Key" button

- Key cards with blue borders

- Blue status badges

### 6. Key Batches Page

- Blue "Generate Batch" button

- Blue batch cards

### 7. Delivery Health Page

- Blue health metrics

- Blue progress indicators

### 8. HWID Bans Page

- Blue "Ban HWID" button

- Red danger for banned items

### 9. Admin Page (Owner Only)

- Blue admin cards

- Blue action buttons

### 10. Validate Page (New)

- Syntax validation tool using Larph API

- Blue "Validate" button

- Results in blue/green

## DISCORD PANEL COMPONENTS (Blue Themed)

### Interactive Buttons:

1. 🔑 Redeem Key - Blue gradient

2. 📜 Get Script - Blue gradient

3. 👤 Get Role - Blue gradient

4. ⚙️ Reset HWID - Blue gradient

5. 📊 Get Stats - Blue outline

### Panel Features:

- Blue embeds with LuaMore branding

- Blue button components

- Auto-send to Discord channel

## DATABASE SCHEMA UPDATES

Add to existing tables:

ALTER TABLE scripts ADD COLUMN larph_hash TEXT;

ALTER TABLE scripts ADD COLUMN is_protected INTEGER DEFAULT 0;

ALTER TABLE script_releases ADD COLUMN larph_hash TEXT;

ALTER TABLE script_releases ADD COLUMN is_protected INTEGER DEFAULT 0;

## AUTHENTICATION SYSTEM

### Login Methods:

1. Discord OAuth2 (with blue branding)

2. Email/Password (with scrypt hashing)

3. API Key (24-character random string)

### Session Management:

- SQLite session store

- 7-day cookie expiration

- Secure cookies in production

- HTTP-only cookies

## ENVIRONMENT VARIABLES

DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN

CLIENT_ID=YOUR_OAUTH_CLIENT_ID

CLIENT_SECRET=YOUR_OAUTH_SECRET

GUILD_ID=YOUR_SERVER_ID

OWNER_ID=YOUR_DISCORD_USER_ID

PUBLIC_BASE_URL=https://your-domain.com

DATABASE_PATH=/path/to/data.sqlite

SESSION_SECRET=random_secret_string

PORT=10000

LARPH_API_URL=http://78.154.103.2:9919

DEFAULT_MAX_SCRIPTS=999999999

DEFAULT_MAX_PANELS=999999999

## DEPENDENCIES

express

better-sqlite3

express-session

discord.js (latest)

crypto

fs

path

form-data

bcrypt (or scrypt)

## DEPLOYMENT

### Install:

npm install express better-sqlite3 express-session discord.js crypto fs path form-data

### Run:

node server.js

## KEY FEATURES SUMMARY

1. Full Larph API obfuscation integration with Light/Standard/Advanced tiers

2. WHITE background with blue accents (clean, modern, professional)

3. Complete Discord bot with 18+ commands (including /create-script and /validate)

4. Interactive Discord panels with 5 blue buttons

5. License key generation and management

6. HWID protection and banning

7. Whitelist system with auto-key generation

8. Script versioning and releases

9. Beta testing with limited testers

10. Delivery health monitoring

11. Bulk key generation (up to 500)

12. Email/Password authentication

13. Discord OAuth2 login

14. API key authentication

15. Admin panel for user management

16. Mobile-responsive design

17. Real-time dashboard data

18. Session-based security

19. Rate limiting

20. SQLite database with WAL mode

21. Syntax validation using Larph API

22. Skid protection with server-side hosting

## UI STYLING (WHITE BACKGROUND)

### Cards:

- White background (#ffffff)

- Blue border (#d0e4ff)

- Box shadow: 0 4px 20px rgba(0,100,200,0.08)

- Hover: 0 8px 32px rgba(0,100,200,0.15)

### Buttons:

- Primary: Blue background (#00aaff) with white text

- Secondary: White background with blue border (#00aaff) and blue text

- Hover: Darker blue (#0088dd)

### Inputs:

- White background (#ffffff)

- Blue border (#d0e4ff)

- Focus: Blue border (#00aaff) with blue glow

### Navigation:

- White background

- Blue active states

- Blue hover effects

### Headers:

- Dark blue text (#1a2a3a)

- Blue accents (#00aaff)

### Badges:

- Blue background with white text

- Light blue background with dark blue text

## HOMEPAGE IMPROVEMENTS (WHITE THEME)

1. Hero section with LuaMore branding on white background

2. Clean white background with blue accent elements

3. Feature cards with white background and blue icons

4. Step-by-step guide with blue numbers

5. Stats counter with blue text

6. Pricing section with white cards

7. Footer with blue links

8. Discord server widget with white background

9. Newsletter signup with blue button

10. Testimonials section with white cards

## UI IMPROVEMENTS (WHITE THEME)

1. Blue buttons with white text

2. Blue border on active states

3. Blue hover effects

4. Blue loading spinners

5. Blue toast notifications

6. Blue progress bars

7. Blue tooltips

8. Clean blue scrollbar

9. Blue selection color

10. Blue focus rings

11. White card backgrounds with blue shadows

12. Clean typography with blue links

13. White background everywhere

14. Light blue section dividers

15. Blue accent lines and decorations

## /CREATE-SCRIPT DISCORD COMMAND DETAILS

### Command Structure:

/create-script <name> <code> [ffa] [obfuscate] [mode]

### Implementation:

- Creates a new script in the database

- Auto-generates public ID

- Optionally obfuscates with Larph API

- Returns script info and loader URL

- Sends response as a Discord embed with blue theme

### Response Embed:

- Title: "✅ Script Created Successfully"

- Fields: Script ID, Name, Public ID, Loader URL, FFA Status, Obfuscation Status, Larph Hash (if protected)

- Color: Blue (#00aaff)

- Footer: LuaMore | Script Management

### Error Responses:

- "❌ Script creation failed: Missing name"

- "❌ Script creation failed: Missing code"

- "❌ Script creation failed: Script limit reached"

- "❌ Obfuscation failed: [error message]"

- "❌ Syntax error: [error message]"

Build this complete system with all features working, using the Larph obfuscation API as the core obfuscation engine. The website should look premium with WHITE background and blue accents, and all Discord bot commands should be fully functional. The system should be production-ready and handle multiple users simultaneously. Update the Discord bot token to the new one provided. Add the /create-script and /validate commands to the bot with full functionality.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://lua-more-power.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7bd6e7b4-0ac9-4ece-9325-2e293b32357d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
