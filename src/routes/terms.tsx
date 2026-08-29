import { createFileRoute } from "@tanstack/react-router";
import { TosPage } from "./tos";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — LuaMore" },
      { name: "description", content: "Terms of Service for LuaMore." },
    ],
  }),
  component: TosPage,
});
