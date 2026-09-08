import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ENGINE_NAME } from "@/lib/obfuscator.server";

export interface StoredScript {
  id: string;
  user_id: string;
  public_id: string;
  name: string;
  code: string;
  obfuscated_code?: string | null;
  obfuscator?: string | null;
  ffa: boolean;
  description?: string | null;
  category?: string | null;
  tags?: string[];
  is_active: boolean;
  is_protected: boolean;
  run_count: number;
  last_run_at?: string | null;
  created_at: string;
  updated_at: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const SCRIPTS_FILE = path.join(DATA_DIR, "scripts-store.json");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Read-only filesystem (e.g. Cloudflare Workers) — no-op.
  }
}

const DEFAULT_SEEDS: Record<string, StoredScript> = {
  "87b653a7b59a722de8": {
    id: "87b653a7-b59a-722d-e800-000000000001",
    user_id: "ec4df13b-794c-a1a9-408e-587110236343",
    public_id: "87b653a7b59a722de8",
    name: "Universal Roblox Script",
    code: `-- LuaMore High-Security Roblox Script
print("[LuaMore] Loading Protected Script...")

local Players = game:GetService("Players")
local localPlayer = Players.LocalPlayer

local function notify(title, text)
  pcall(function()
    game:GetService("StarterGui"):SetCore("SendNotification", {
      Title = title,
      Text = text,
      Duration = 5
    })
  end)
end

notify("LuaMore Verified", "Script executed successfully for " .. (localPlayer and localPlayer.Name or "Player"))
print("[LuaMore] Successfully initialized and verified!")
`,
    ffa: true,
    is_active: true,
    is_protected: true,
    run_count: 142,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  "1349b82b8502467a97b9c7c516d84697": {
    id: "1349b82b-8502-467a-97b9-c7c516d84697",
    user_id: "ec4df13b-794c-a1a9-408e-587110236343",
    public_id: "1349b82b8502467a97b9c7c516d84697",
    name: "Delta Universal Hub",
    code: `-- LuaMore Delta Universal Hub
print("[LuaMore] Delta Universal Hub Loaded!")
local Players = game:GetService("Players")
local lp = Players.LocalPlayer
print("[LuaMore] Player: " .. (lp and lp.Name or "Unknown"))
`,
    ffa: true,
    is_active: true,
    is_protected: true,
    run_count: 538,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

const OWNER_UUID = "ec4df13b-794c-a1a9-408e-587110236343";
const LEGACY_ALIASES = new Set(["demo-user", "a1b2c3d4-e5f6-7890-abcd-ef1234567890"]);

function loadScripts(): Record<string, StoredScript> {
  try {
    ensureDataDir();
    if (fs.existsSync(SCRIPTS_FILE)) {
      const raw = fs.readFileSync(SCRIPTS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      const merged = { ...DEFAULT_SEEDS, ...parsed } as Record<string, StoredScript>;
      // Auto-migrate any legacy user_id to OWNER_UUID so Discord ID 1207803375807373415 owns them
      let migrated = false;
      for (const k of Object.keys(merged)) {
        if (LEGACY_ALIASES.has(merged[k].user_id) || merged[k].user_id === "demo-user") {
          merged[k].user_id = OWNER_UUID;
          migrated = true;
        }
      }
      if (migrated) {
        try { saveScripts(merged); } catch {}
      }
      return merged;
    }
  } catch (err) {
    console.error("Failed to read scripts store:", err);
  }
  return { ...DEFAULT_SEEDS };
}

function saveScripts(scripts: Record<string, StoredScript>) {
  try {
    ensureDataDir();
    fs.writeFileSync(SCRIPTS_FILE, JSON.stringify(scripts, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write scripts store:", err);
  }
}

export function generatePublicId(): string {
  // Generates 18 uppercase hex characters like 87B653A7B59A722DE8
  return crypto.randomBytes(9).toString("hex").toUpperCase();
}

export function getAllScripts(userId?: string): StoredScript[] {
  const map = loadScripts();
  const list = Object.values(map);
  if (userId) {
    const wantsOwner = userId === OWNER_UUID || LEGACY_ALIASES.has(userId) || userId === "demo-user";
    return list
      .filter((s) => {
        if (s.user_id === userId) return true;
        // Alias: owner queries also get legacy, and legacy queries also get owner scripts
        if (wantsOwner && (s.user_id === OWNER_UUID || LEGACY_ALIASES.has(s.user_id) || s.user_id === "demo-user")) return true;
        return false;
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }
  return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function getScriptById(id: string, userId?: string): StoredScript | null {
  const map = loadScripts();
  const script = map[id];
  if (!script) return null;
  if (userId) {
    const same = script.user_id === userId;
    const aliasMatch = (userId === OWNER_UUID || LEGACY_ALIASES.has(userId) || userId === "demo-user") &&
                       (script.user_id === OWNER_UUID || LEGACY_ALIASES.has(script.user_id) || script.user_id === "demo-user");
    if (!same && !aliasMatch) return null;
  }
  return script;
}

export function getScriptByPublicId(publicId: string): StoredScript | null {
  const map = loadScripts();
  const target = String(publicId || "")
    .trim()
    .toLowerCase();
  for (const script of Object.values(map)) {
    if (script.public_id === publicId || script.public_id?.toLowerCase() === target) {
      return script;
    }
  }
  return null;
}

export function saveScript(
  payload: Partial<StoredScript> & { user_id: string; name: string },
): StoredScript {
  const map = loadScripts();
  const now = new Date().toISOString();
  const id = payload.id || crypto.randomUUID();
  const existing = map[id];

  const updated: StoredScript = {
    id,
    user_id: payload.user_id,
    public_id: existing?.public_id || payload.public_id || generatePublicId(),
    name: payload.name.trim(),
    code: payload.code !== undefined ? payload.code : existing?.code || "",
    obfuscated_code:
      payload.obfuscated_code !== undefined
        ? payload.obfuscated_code
        : existing?.obfuscated_code || null,
    obfuscator:
      payload.obfuscator !== undefined ? payload.obfuscator : existing?.obfuscator || ENGINE_NAME,
    ffa: payload.ffa !== undefined ? Boolean(payload.ffa) : (existing?.ffa ?? false),
    description:
      payload.description !== undefined ? payload.description : existing?.description || null,
    category: payload.category !== undefined ? payload.category : existing?.category || null,
    tags: payload.tags !== undefined ? payload.tags : existing?.tags || [],
    is_active:
      payload.is_active !== undefined ? Boolean(payload.is_active) : (existing?.is_active ?? true),
    is_protected:
      payload.is_protected !== undefined
        ? Boolean(payload.is_protected)
        : (existing?.is_protected ?? false),
    run_count: existing?.run_count ?? 0,
    last_run_at: existing?.last_run_at ?? null,
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  map[id] = updated;
  saveScripts(map);
  return updated;
}

export function deleteScriptById(id: string, userId: string): boolean {
  const map = loadScripts();
  if (map[id] && map[id].user_id === userId) {
    delete map[id];
    saveScripts(map);
    return true;
  }
  return false;
}

export function bumpScriptRuns(id: string): void {
  const map = loadScripts();
  if (map[id]) {
    map[id].run_count = (map[id].run_count || 0) + 1;
    map[id].last_run_at = new Date().toISOString();
    saveScripts(map);
  }
}
