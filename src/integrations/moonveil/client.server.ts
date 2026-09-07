import { z } from "zod";

const MOONVEIL_BASE_URL = "https://moonveil.cc/api";
const MOONVEIL_KEY = process.env.MOONVEIL_API_KEY || "";

const MoonVeilOptionsSchema = z.object({
  compileType: z.enum(["cff", "vm", "safeEnv"]).default("cff"),
  vmType: z.enum(["fox", "skid"]).default("skid"),
  safeEnvLock: z.enum(["luau", "rbx"]).default("luau"),
  cffDecompose: z.boolean().default(false),
  cffMangleNext: z.boolean().default(false),
  cffMangleStrings: z.boolean().default(false),
  cffMangleGlobals: z.boolean().default(false),
  cffMangleCfPercent: z.number().min(0).max(100).default(0),
});

export type MoonVeilOptions = z.infer<typeof MoonVeilOptionsSchema>;

export type MoonVeilAccount = {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  opLevel: number;
  hasBilling: boolean;
  plan: {
    name: string;
    maxScriptChars: number;
    dailyQuota: number;
    allowedOptions: {
      vms: string[];
      compileTypes: string[];
    };
  };
  usage: {
    used: number;
    quota: number;
    obfuscationCount: number;
    resetsAt: string;
  };
};

async function moonveilRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!MOONVEIL_KEY) {
    throw new Error("MoonVeil API key is not configured");
  }

  const url = `${MOONVEIL_BASE_URL}${path}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${MOONVEIL_KEY}`);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    const text = await res.text();
    let message = `MoonVeil API error ${res.status}`;
    try {
      const err = JSON.parse(text) as { error?: string };
      if (err.error) message = err.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  return (await res.text()) as unknown as T;
}

export async function getMoonVeilAccount(): Promise<MoonVeilAccount> {
  return moonveilRequest<MoonVeilAccount>("/account");
}

export async function obfuscateWithMoonVeil(
  source: string,
  options: Partial<MoonVeilOptions> = {},
): Promise<string> {
  if (source.length > 10_000_000) {
    throw new Error("MoonVeil API rejects scripts larger than 10,000,000 characters");
  }

  const parsed = MoonVeilOptionsSchema.parse(options);

  const body = {
    script: source,
    options: parsed,
  };

  const result = await moonveilRequest<string>("/v2/obf", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return result;
}

export async function prettifyWithMoonVeil(source: string): Promise<string> {
  const result = await moonveilRequest<string>("/v2/prettify", {
    method: "POST",
    body: JSON.stringify({ script: source }),
  });
  return result;
}

export async function minifyWithMoonVeil(source: string): Promise<string> {
  const result = await moonveilRequest<string>("/v2/minify", {
    method: "POST",
    body: JSON.stringify({ script: source }),
  });
  return result;
}

export function isMoonVeilConfigured(): boolean {
  return MOONVEIL_KEY.length > 0;
}
