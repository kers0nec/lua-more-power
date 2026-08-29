import { createFileRoute } from "@tanstack/react-router";
import { LoadingScreenGuide } from "@/components/LoadingScreenGuide";

export const Route = createFileRoute("/loading-screens")({
  head: () => ({
    meta: [
      { title: "Loading screens — LuaMore" },
      {
        name: "description",
        content: "Four responsive loading bar presets for LuaMore script loaders.",
      },
    ],
  }),
  component: LoadingScreenGuide,
});
