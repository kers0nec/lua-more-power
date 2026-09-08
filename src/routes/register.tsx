import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/register")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create your LuaMore account" },
      {
        name: "description",
        content:
          "Sign up with Discord in one click and start protecting Luau scripts with LuaMore.",
      },
      { property: "og:title", content: "Create your LuaMore account" },
      {
        property: "og:description",
        content: "Sign up with Discord in one click and start protecting Luau scripts with LuaMore.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://luamore.app/register" },
      { property: "og:image", content: "https://luamore.app/luamore-glow.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://luamore.app/luamore-glow.webp" },
    ],
    links: [{ rel: "canonical", href: "https://luamore.app/register" }],
  }),
  component: () => <AuthForm initialMode="signup" />,
});
