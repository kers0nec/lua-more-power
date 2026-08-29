import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/register")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create account — LuaMore" },
      {
        name: "description",
        content:
          "Create your free LuaMore account. Protect your first script whenever you're ready.",
      },
    ],
  }),
  component: () => <AuthForm initialMode="signup" />,
});
