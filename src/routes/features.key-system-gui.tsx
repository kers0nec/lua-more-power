import { createFileRoute } from "@tanstack/react-router";
import { LoadingScreenGuide } from "@/components/LoadingScreenGuide";

export const Route = createFileRoute("/features/key-system-gui")({
  head: () => ({
    meta: [
      { title: "Key System GUI — LuaMore" },
      {
        name: "description",
        content: "Build a responsive LuaMore loading interface for key validation and script delivery.",
      },
      { property: "og:title", content: "Key System GUI — LuaMore" },
      {
        property: "og:description",
        content: "Responsive loading interfaces for LuaMore key validation and script delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoadingScreenGuide,
});