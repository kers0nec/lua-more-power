import { supabase } from "@/integrations/supabase/client";
import type { User, EmailOtpType } from "@supabase/supabase-js";

export interface AuthResult {
  success: boolean;
  user: User | null;
  error?: string | null;
  type?: string | null;
}

let handlingPromise: Promise<AuthResult> | null = null;

export async function handleIncomingAuth(): Promise<AuthResult> {
  if (typeof window === "undefined") {
    return { success: false, user: null };
  }

  // Prevent multiple concurrent token exchange calls
  if (handlingPromise) {
    return handlingPromise;
  }

  handlingPromise = (async () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const rawHash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(rawHash);

      // Check for OAuth / Email token error in search or hash
      const errorDescription =
        searchParams.get("error_description") ||
        searchParams.get("error") ||
        hashParams.get("error_description") ||
        hashParams.get("error");

      if (errorDescription) {
        cleanAuthUrlParams();
        return {
          success: false,
          user: null,
          error: decodeURIComponent(errorDescription.replace(/\+/g, " ")),
        };
      }

      // 1. Email OTP / Token Hash Verification (token_hash or token + type/email)
      const tokenHash = searchParams.get("token_hash") || hashParams.get("token_hash");
      const token = searchParams.get("token") || hashParams.get("token");
      const emailParam = searchParams.get("email") || hashParams.get("email");
      const rawType = searchParams.get("type") || hashParams.get("type");
      const otpType = (rawType || "email") as EmailOtpType;

      if (tokenHash) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });

        if (error) {
          cleanAuthUrlParams();
          return {
            success: false,
            user: null,
            error: error.message || "Failed to verify email token. The link may have expired.",
          };
        }

        if (data.session?.user || data.user) {
          cleanAuthUrlParams();
          return {
            success: true,
            user: data.session?.user || data.user,
            type: rawType,
          };
        }
      } else if (token && emailParam) {
        const { data, error } = await supabase.auth.verifyOtp({
          email: emailParam,
          token: token,
          type: otpType,
        });

        if (error) {
          cleanAuthUrlParams();
          return {
            success: false,
            user: null,
            error: error.message || "Failed to verify email token. The link may have expired.",
          };
        }

        if (data.session?.user || data.user) {
          cleanAuthUrlParams();
          return {
            success: true,
            user: data.session?.user || data.user,
            type: rawType,
          };
        }
      }

      // 2. PKCE Authorization Code (?code=...)
      const code = searchParams.get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.warn("[Auth] Code exchange error:", error.message);
          cleanAuthUrlParams();
          // Fallback to checking active session
        } else if (data.session?.user || data.user) {
          cleanAuthUrlParams();
          return {
            success: true,
            user: data.session?.user || data.user,
          };
        }
      }

      // 3. Hash Access Token (#access_token=...&refresh_token=...)
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        cleanAuthUrlParams();
        if (!error && data?.session?.user) {
          return {
            success: true,
            user: data.session.user,
          };
        }
      }

      // 4. Check standard session
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        return {
          success: true,
          user: sessionData.session.user,
        };
      }

      // 5. Check user info
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        return {
          success: true,
          user: userData.user,
        };
      }

      return { success: false, user: null };
    } catch (err) {
      console.error("[Auth] handleIncomingAuth error:", err);
      return {
        success: false,
        user: null,
        error: err instanceof Error ? err.message : "Authentication failed",
      };
    } finally {
      handlingPromise = null;
    }
  })();

  return handlingPromise;
}

function cleanAuthUrlParams() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("code");
    url.searchParams.delete("token_hash");
    url.searchParams.delete("type");
    url.searchParams.delete("error");
    url.searchParams.delete("error_description");
    url.searchParams.delete("error_code");
    url.hash = "";
    window.history.replaceState({}, document.title, url.pathname + (url.search || ""));
  } catch {
    /* ignore */
  }
}
