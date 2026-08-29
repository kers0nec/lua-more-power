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

function TosPage() {
  return (
    <PageShell eyebrow="Legal" title="Terms of Service" subtitle="Last updated: August 29, 2026">
      <article className="prose-lm space-y-6 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of LuaMore
          (&quot;LuaMore,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) and related services,
          including our dashboard, loader runtime, Discord bot integrations, and APIs. By creating an
          account or using the service, you agree to these Terms and our{" "}
          <Link to="/privacy" className="underline" style={{ color: "var(--foreground)" }}>
            Privacy Policy
          </Link>
          .
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">1. The service</h2>
        <p>
          LuaMore provides tools for Roblox script creators, including script storage and delivery,
          license key management, obfuscation, loader authentication, Discord access panels, and usage
          analytics. The service is free. We may add, change, limit, or remove features at any time.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">2. Eligibility and accounts</h2>
        <p>
          You must be at least 13 years old (or the minimum age required in your jurisdiction) to use
          LuaMore. You are responsible for keeping your login credentials secure and for all activity
          under your account. You must provide accurate account information and may not share accounts.
        </p>
        <p>
          You may link optional Discord sign-in. Linking Discord enables bot features you configure; you
          can disconnect integrations from your dashboard where supported.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">3. Your content and licenses</h2>
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
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">4. End users and keys</h2>
        <p>
          If you issue license keys to players, you are responsible for your relationship with those
          users, including support and compliance with platform rules (including Roblox and Discord
          terms). LuaMore provides technical enforcement tools (HWID binding, session limits, revocation)
          but does not guarantee prevention of all cheating, leaking, or circumvention.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">5. Acceptable use</h2>
        <p>You agree not to use LuaMore to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Distribute malware, phishing, credential stealers, or unauthorized remote access tools</li>
          <li>Harass, exploit, or harm others, or facilitate violations of Roblox, Discord, or other platform rules</li>
          <li>Attack, probe, or overload our infrastructure or bypass rate limits and security controls</li>
          <li>Resell or sublicense the service without our written permission</li>
          <li>Misrepresent LuaMore, impersonate our staff, or abuse referral programs</li>
          <li>Use obfuscation or protection solely to conceal clearly malicious behavior</li>
        </ul>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">6. Plans and billing</h2>
        <p>
          LuaMore is provided free of charge. There are no paid subscriptions, no Stripe charges, and no
          ad-network checkpoints operated by LuaMore.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">7. Third-party services</h2>
        <p>
          LuaMore integrates with third parties you may enable, including Discord (bots and OAuth). Your
          use of those services is also subject to their terms and policies. We are not responsible for
          third-party outages, policy changes, or data handling outside our control.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">8. Team access</h2>
        <p>
          Project owners may invite team members with scoped access. Owners are responsible for invites
          they send and actions taken by members on their projects.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">9. Intellectual property</h2>
        <p>
          LuaMore&apos;s name, branding, software, and documentation are our property or our licensors&apos;.
          These Terms do not grant you any rights to our trademarks except as needed to use the service.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">10. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM EXTENT
          PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">11. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, LUAMORE AND ITS OPERATORS WILL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY FOR ANY
          CLAIM RELATING TO THE SERVICE IS LIMITED TO USD $50.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">12. Termination</h2>
        <p>
          You may stop using LuaMore at any time. We may suspend or terminate your account if you
          violate these Terms, create security or legal risk, or if required by law.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">13. Changes</h2>
        <p>
          We may update these Terms from time to time. Material changes will be posted on this page with
          an updated date. Continued use after changes become effective constitutes acceptance.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">14. Contact</h2>
        <p>
          Questions about these Terms can be sent through our{" "}
          <a href={DISCORD_SUPPORT} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--foreground)" }}>
            Discord server
          </a>
          .
        </p>
      </article>
    </PageShell>
  );
}
