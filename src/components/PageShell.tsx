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
        <section className="relative overflow-hidden border-b border-border bg-[image:var(--gradient-hero)]">
          <div className="grid-bg mask-fade pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto w-full max-w-6xl px-6 py-18 md:py-24">
            {eyebrow ? <div className="eyebrow text-primary">{eyebrow}</div> : null}
            <h1 className="mt-4 max-w-4xl font-display text-4xl md:text-6xl">{title}</h1>
            {subtitle ? <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{subtitle}</p> : null}
          </div>
        </section>
        <div className="mx-auto w-full max-w-6xl px-6 py-14 md:py-18">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
