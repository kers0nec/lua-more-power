import { createFileRoute } from "@tanstack/react-router";
import { LoadingScreenGuide } from "@/components/LoadingScreenGuide";

export const Route = createFileRoute("/loading-screens")({
  head: () => ({
    meta: [
      { title: "Loading screens for LuaMore loaders" },
      {
        name: "description",
        content:
          "Four responsive loading bar presets you can drop into any LuaMore script loader.",
      },
      { property: "og:title", content: "Loading screens for LuaMore loaders" },
      {
        property: "og:description",
        content:
          "Four responsive loading bar presets you can drop into any LuaMore script loader.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://luamore.app/loading-screens" },
      { property: "og:image", content: "https://luamore.app/luamore-glow.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://luamore.app/luamore-glow.webp" },
    ],
    links: [{ rel: "canonical", href: "https://luamore.app/loading-screens" }],
  }),
  component: LoadingScreenGuide,
});
