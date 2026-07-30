// Server-only Larph API client. Never import from client-reachable modules
// directly — always call through a createServerFn wrapper.

export type LarphMode = "light" | "standard" | "advanced";

export interface LarphResult {
  output: string;
  protected: boolean;
  hash: string | null;
}

function modeToOptions(mode: LarphMode) {
  return {
    scramble: mode !== "light",
    skidProtection: mode === "advanced",
  };
}

function baseUrl() {
  return process.env.LARPH_API_URL || "http://78.154.103.2:9919";
}

export async function obfuscateWithLarph(code: string, mode: LarphMode = "standard"): Promise<LarphResult> {
  const res = await fetch(`${baseUrl()}/api/obfuscate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, options: modeToOptions(mode) }),
  });

  if (!res.ok) {
    let msg = `Larph obfuscation failed (HTTP ${res.status})`;
    try {
      const err = (await res.json()) as { error?: string; code?: string };
      if (err.error) msg = err.error;
    } catch {}
    throw new Error(msg);
  }

  const data = (await res.json()) as { output: string; protected?: boolean; hash?: string };
  return {
    output: data.output,
    protected: Boolean(data.protected),
    hash: data.hash ?? null,
  };
}

export async function validateWithLarph(code: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(`${baseUrl()}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      let msg = `Validation failed (HTTP ${res.status})`;
      try {
        const err = (await res.json()) as { error?: string };
        if (err.error) msg = err.error;
      } catch {}
      return { valid: false, error: msg };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
