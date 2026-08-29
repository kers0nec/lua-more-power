import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface DiscordSession {
  userId: string;
  discordId: string;
  email?: string;
  username?: string;
  accessToken?: string;
  refreshToken?: string;
  linkedAt: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const SESSIONS_FILE = path.join(DATA_DIR, "discord-sessions.json");

function getSecretKey(): string {
  return (
    process.env.DISCORD_BOT_TOKEN ||
    process.env.DISCORD_PUBLIC_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    "luamore-secret-salt-2026"
  );
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSessions(): Record<string, DiscordSession> {
  ensureDataDir();
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to read discord sessions:", err);
  }
  return {};
}

function saveSessions(sessions: Record<string, DiscordSession>) {
  ensureDataDir();
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write discord sessions:", err);
  }
}

/**
 * Generate a cryptographically signed API key that embeds the user ID
 */
export function generateSignedApiKey(userId: string): string {
  const timestamp = Date.now().toString(36);
  const nonce = crypto.randomBytes(4).toString("hex");
  const payload = `${userId}:${timestamp}:${nonce}`;
  const hmac = crypto
    .createHmac("sha256", getSecretKey())
    .update(payload)
    .digest("base64url")
    .slice(0, 16);
  const payloadB64 = Buffer.from(payload).toString("base64url");
  return `lm.${payloadB64}.${hmac}`;
}

/**
 * Verify a signed API key and return the extracted userId if valid
 */
export function verifySignedApiKey(key: string): string | null {
  const clean = key
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["'`]|["'`]$/g, "");
  if (!clean.startsWith("lm.") && !clean.startsWith("lm_")) return null;

  const lastSep = clean.lastIndexOf(".") !== -1 ? clean.lastIndexOf(".") : clean.lastIndexOf("_");
  if (lastSep <= 3) return null;

  const signature = clean.slice(lastSep + 1);
  const b64Payload = clean.slice(3, lastSep);

  try {
    const payload = Buffer.from(b64Payload, "base64url").toString("utf-8");
    const [userId] = payload.split(":");
    if (!userId || !/^[0-9a-fA-F-]{36}$/.test(userId)) return null;

    const expectedHmac = crypto
      .createHmac("sha256", getSecretKey())
      .update(payload)
      .digest("base64url")
      .slice(0, 16);

    if (signature === expectedHmac) {
      return userId;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Store a linked Discord session
 */
export function setDiscordSession(discordId: string, session: DiscordSession) {
  const sessions = loadSessions();
  sessions[discordId] = session;
  saveSessions(sessions);
}

/**
 * Get a linked Discord session
 */
export function getDiscordSession(discordId: string): DiscordSession | null {
  const sessions = loadSessions();
  return sessions[discordId] || null;
}

/**
 * Find Discord session by LuaMore User ID
 */
export function getDiscordSessionByUserId(userId: string): DiscordSession | null {
  const sessions = loadSessions();
  for (const s of Object.values(sessions)) {
    if (s.userId === userId) return s;
  }
  return null;
}

/**
 * Create a Supabase client that acts on behalf of the Discord user (bypassing RLS issues)
 */
export function getSupabaseForDiscord(discordId?: string) {
  const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "https://pbuakztqfvvgooabtjkf.supabase.co";
  const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_CO_vJ2OOKf7G6FK1KEe3Mg_77ZDDmCb";

  const session = discordId ? getDiscordSession(discordId) : null;
  const token = session?.accessToken;

  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  });
}
