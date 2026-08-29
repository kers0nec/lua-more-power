export const DISCORD_INVITE = "https://discord.gg/YECBsBfJy5";
export const DISCORD_SUPPORT = "https://discord.gg/yupFgUkFfr";
export const SITE_NAME = "LuaMore";
export const SITE_TAGLINE = "More Power, More Security, More Lua.";
export const USERNAME_RE = /^[A-Za-z0-9]{3,24}$/;
export const USERNAME_HINT =
  "Use 3–24 letters or numbers only — no spaces, underscores, or symbols.";

export const OWNER_EMAILS = ["kers0nedontrunit@outlook.com", "brittainjaden347@gmail.com"];

export function isOwnerAccount(emailOrUsername?: string | null): boolean {
  if (!emailOrUsername) return false;
  const lower = emailOrUsername.trim().toLowerCase();
  return (
    OWNER_EMAILS.some((e) => e.toLowerCase() === lower) ||
    lower === "kers0ne" ||
    lower === "kers0nedontrunit"
  );
}
