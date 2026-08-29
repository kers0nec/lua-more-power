import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — LuaMore" },
      { name: "description", content: "Sign in to LuaMore. Scripts, keys, and access." },
    ],
  }),
  component: () => <AuthForm initialMode="signin" />,
});
