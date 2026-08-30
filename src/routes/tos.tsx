import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { DISCORD_SUPPORT } from "@/lib/site";

export const Route = createFileRoute("/tos")({
  head: () => ({
    meta: [
      { title: "Terms of Service — LuaMore" },
      { name: "description", content: "Terms of Service for LuaMore." },
    ],
  }),
  component: TosPage,
});

export function TosPage() {
  return (
    <PageShell eyebrow="Legal" title="Terms of Service" subtitle="Last updated: August 30, 2026">
      <article className="space-y-6 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of LuaMore
          (&quot;LuaMore,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) and related
          services, including our dashboard, loader runtime, Discord bot integrations, and APIs. By
          creating an account or using the service, you agree to these Terms and our{" "}
          <Link to="/privacy" className="underline" style={{ color: "var(--foreground)" }}>
            Privacy Policy
          </Link>
          .
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">1. The service</h2>
        <p>
          LuaMore provides tools for Roblox script creators, including script storage and delivery,
          license key management, obfuscation integrations, loader authentication, heartbeat
          monitoring, Discord access panels, webhooks, team collaboration on projects, and usage
          analytics. The service is free — there are no paid plans or billing. We may add, change,
          limit, or remove features at any time.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">
          2. Eligibility and accounts
        </h2>
        <p>
          You must be at least 13 years old (or the minimum age required in your jurisdiction) to
          use LuaMore. You are responsible for keeping your login credentials secure and for all
          activity under your account. You must provide accurate account information and may not
          share accounts or circumvent account limits (including device-based signup limits).
        </p>
        <p>
          You may link optional Discord sign-in. Linking Discord enables bot features you configure;
          you can disconnect integrations from your dashboard where supported.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">
          3. Your content and licenses
        </h2>
        <p>
          You retain ownership of scripts, keys, project settings, and other content you upload or
          configure (&quot;Your Content&quot;). You grant LuaMore a limited license to host, process,
          transmit, obfuscate (when you request it), and deliver Your Content solely to operate the
          service for you and your end users.
        </p>
        <p>
          You represent that you have the rights to upload and distribute Your Content and that Your
          Content does not violate applicable law or third-party rights.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">
          4. End users and keys
        </h2>
        <p>
          If you issue license keys to players, you are responsible for your relationship with those
          users, including support, and compliance with platform rules (including Roblox and Discord
          terms). LuaMore provides technical enforcement tools (HWID binding, session limits,
          revocation, anti-bypass policies you configure, and similar controls) but does not
          guarantee prevention of all cheating, leaking, or circumvention.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">5. Acceptable use</h2>
        <p>You agree not to use LuaMore to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Distribute malware, phishing, credential stealers, or unauthorized remote access tools
          </li>
          <li>
            Harass, exploit, or harm others, or facilitate violations of Roblox, Discord, or other
            platform rules
          </li>
          <li>
            Attack, probe, or overload our infrastructure or bypass rate limits and security controls
          </li>
          <li>Resell or sublicense the service without our written permission</li>
          <li>Misrepresent LuaMore, impersonate our staff, or abuse referral or reward programs</li>
          <li>
            Use obfuscation or protection solely to conceal clearly malicious behavior
          </li>
        </ul>
        <p>
          We may investigate abuse reports, security signals, and automated detections (including
          tamper telemetry and hook reports from loaders you distribute). Violations may result in
          suspension, key revocation, or permanent termination.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">
          6. Free service
        </h2>
        <p>
          LuaMore is free. There are no paid subscriptions, no billing, no Stripe, and no
          checkpoints. All features — including unlimited scripts, keys, obfuscation, and Discord
          panels — are available to every account at no cost. We may introduce optional premium
          features in the future but core functionality will remain free.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">
          7. Third-party services
        </h2>
        <p>
          LuaMore integrates with third parties you may enable, including Discord (bots and OAuth)
          and obfuscation providers. Your use of those services is also subject to their terms and
          policies. We are not responsible for third-party outages, policy changes, or data handling
          outside our control.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">8. Team access</h2>
        <p>
          Project owners may invite team members with scoped access. Owners are responsible for
          invites they send and actions taken by members on their projects.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">
          9. Intellectual property
        </h2>
        <p>
          LuaMore&apos;s name, branding, software, and documentation are our property or our
          licensors&apos;. These Terms do not grant you any rights to our trademarks or service
          except as needed to use the service.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">10. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM
          EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT
          UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE OPERATION.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">
          11. Limitation of liability
        </h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, LUAMORE AND ITS OPERATORS WILL NOT BE LIABLE FOR
          ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
          PROFITS, DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING FROM YOUR USE OF THE SERVICE.
          OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF (A)
          USD $50 OR (B) THE AMOUNT YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">12. Termination</h2>
        <p>
          You may stop using LuaMore at any time. We may suspend or terminate your account if you
          violate these Terms, create security or legal risk, or if required by law. Upon
          termination, your right to use the service ends; we may delete or retain data as described
          in our Privacy Policy.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">13. Changes</h2>
        <p>
          We may update these Terms from time to time. Material changes will be posted on this page
          with an updated date. Continued use after changes become effective constitutes acceptance
          of the revised Terms.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">14. Contact</h2>
        <p>
          Questions about these Terms can be sent through our{" "}
          <a
            href={DISCORD_SUPPORT}
            target="_blank"
            rel="noreferrer"
            className="underline"
            style={{ color: "var(--foreground)" }}
          >
            Discord server
          </a>
          .
        </p>

        <div
          className="border-t pt-6 flex flex-wrap gap-4 text-xs"
          style={{ borderColor: "var(--border)" }}
        >
          <Link to="/privacy" className="underline" style={{ color: "var(--foreground)" }}>
            Privacy Policy
          </Link>
          <Link to="/tos" className="underline" style={{ color: "var(--foreground)" }}>
            Terms of Service
          </Link>
          <a
            href={DISCORD_SUPPORT}
            target="_blank"
            rel="noreferrer"
            className="underline"
            style={{ color: "var(--foreground)" }}
          >
            Discord
          </a>
        </div>

        <p className="font-mono text-[11px] uppercase tracking-[0.18em] pt-4" style={{ color: "var(--muted-foreground)" }}>
          © {new Date().getFullYear()} LuaMore
        </p>
      </article>
    </PageShell>
  );
}
