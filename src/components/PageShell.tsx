import type { ReactNode } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export function PageShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <section
          className="relative overflow-hidden border-b"
          style={{ background: "var(--gradient-hero)", borderColor: "var(--border)" }}
        >
          <div className="grid-bg mask-fade pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto w-full max-w-5xl px-6 py-16 md:py-20">
            {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-6xl">{title}</h1>
            {subtitle ? (
              <p className="mt-5 max-w-2xl text-base" style={{ color: "var(--muted-foreground)" }}>
                {subtitle}
              </p>
            ) : null}
          </div>
        </section>
        <div className="mx-auto w-full max-w-5xl px-6 py-14">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
