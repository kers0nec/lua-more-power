import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadScripts(): Record<string, StoredScript> {
  ensureDataDir();
  try {
    if (fs.existsSync(SCRIPTS_FILE)) {
      const raw = fs.readFileSync(SCRIPTS_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to read scripts store:", err);
  }
  return {};
}

function saveScripts(scripts: Record<string, StoredScript>) {
  ensureDataDir();
  try {
    fs.writeFileSync(SCRIPTS_FILE, JSON.stringify(scripts, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write scripts store:", err);
  }
}

function generatePublicId(): string {
  return "s_" + crypto.randomBytes(6).toString("base64url").slice(0, 8);
}

export function getAllScripts(userId?: string): StoredScript[] {
  const map = loadScripts();
  const list = Object.values(map);
  if (userId) {
    return list
      .filter((s) => s.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }
  return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function getScriptById(id: string, userId?: string): StoredScript | null {
  const map = loadScripts();
  const script = map[id];
  if (!script) return null;
  if (userId && script.user_id !== userId) return null;
  return script;
}

export function getScriptByPublicId(publicId: string): StoredScript | null {
  const map = loadScripts();
  for (const script of Object.values(map)) {
    if (script.public_id === publicId) return script;
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
      payload.obfuscator !== undefined ? payload.obfuscator : existing?.obfuscator || "luamore-v11",
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
