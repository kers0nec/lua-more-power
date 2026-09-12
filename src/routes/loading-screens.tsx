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
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://luamore.app/loading-screens" }],
  }),
  component: LoadingScreenGuide,
});
