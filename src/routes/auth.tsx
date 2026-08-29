import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — LuaMore" },
      {
        name: "description",
        content: "Sign in or create your LuaMore account to host and protect Luau scripts.",
      },
    ],
  }),
  component: () => <AuthForm initialMode="signin" />,
});
