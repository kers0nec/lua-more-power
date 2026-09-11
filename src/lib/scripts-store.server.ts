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
const OWNER_UUID = "ec4df13b-794c-a1a9-408e-587110236343";
export const OWNER_DISCORD_ID = "1207803375807373415";

export function isOwnerUser(userId: string): boolean {
  return userId === OWNER_UUID;
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Read-only filesystem (e.g. Cloudflare Workers) — no-op.
  }
}

function loadScripts(): Record<string, StoredScript> {
  try {
    ensureDataDir();
    if (fs.existsSync(SCRIPTS_FILE)) {
      const raw = fs.readFileSync(SCRIPTS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, StoredScript>) : {};
    }
  } catch (err) {
    console.error("Failed to read scripts store:", err);
  }
  return {};
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
  return crypto.randomBytes(9).toString("hex").toUpperCase();
}

export function getAllScripts(userId?: string): StoredScript[] {
  const map = loadScripts();
  return Object.values(map)
    .filter((script) => !userId || script.user_id === userId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function getScriptById(id: string, userId?: string): StoredScript | null {
  const script = loadScripts()[id];
  if (!script || (userId && script.user_id !== userId)) return null;
  return script;
}

export function getScriptByPublicId(publicId: string): StoredScript | null {
  const target = String(publicId || "")
    .trim()
    .toLowerCase();
  for (const script of Object.values(loadScripts())) {
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
