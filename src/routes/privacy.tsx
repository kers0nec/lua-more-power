import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { DISCORD_SUPPORT } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — LuaMore" },
      { name: "description", content: "Privacy Policy for LuaMore." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PageShell eyebrow="Legal" title="Privacy Policy" subtitle="Last updated: August 30, 2026">
      <article className="space-y-6 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
        <p>
          This Privacy Policy explains how LuaMore (&quot;we,&quot; &quot;us&quot;) collects, uses,
          stores, and shares information when you use LuaMore, our dashboard, loader runtime,
          Discord integrations, and related APIs. It should be read together with our{" "}
          <Link to="/tos" className="underline" style={{ color: "var(--foreground)" }}>
            Terms of Service
          </Link>
          .
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">
          1. Information we collect
        </h2>
        <p>
          <strong className="text-[color:var(--foreground)]">Account and profile.</strong> When you
          register, we collect your email address, display name / username, and a hashed password.
          If you enable two-factor authentication, we store the settings and secrets needed to verify
          codes (for example, a TOTP secret for an authenticator app, or your phone number if you
          enable SMS). We record when you accept these Terms and our Privacy Policy. Email is used
          for account recovery and key delivery notices.
        </p>
        <p>
          Optional Discord sign-in may store your Discord user ID, username, display name, and
          configuration for panels, roles, slash commands, and key redemption flows you enable.
        </p>
        <p>
          <strong className="text-[color:var(--foreground)]">Projects, scripts, and keys.</strong>{" "}
          We store projects, scripts, obfuscated outputs, license keys, key metadata (status,
          expiration, execution counts, type), HWID hashes you bind to keys, and settings you
          configure (including anti-bypass policies, webhooks, and Discord integrations).
        </p>
        <p>
          <strong className="text-[color:var(--foreground)]">Loader and runtime activity.</strong>{" "}
          When end users run your loader, we process technical data needed to authenticate and
          deliver scripts, including:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Hashed IP address (HMAC-SHA256 binding identifier — raw IPs are not stored)</li>
          <li>Country (ISO 3166-1 alpha-2 code inferred from our hosting edge)</li>
          <li>Hashed hardware identifiers (HWID) where your configuration uses them</li>
          <li>Executor name reported by the client</li>
          <li>Roblox place or game identifiers when provided by the loader</li>
          <li>Session nonces, heartbeat timestamps, and delivery telemetry</li>
          <li>Security and tamper signals when your anti-bypass settings are enabled</li>
        </ul>
        <p>LuaMore does not process payments and does not store payment card numbers.</p>
        <p>
          <strong className="text-[color:var(--foreground)]">Signup abuse prevention.</strong> To
          limit fraudulent account creation, we may store hashed device fingerprints, hashed IP
          addresses, and hashed user-agent strings associated with new registrations.
        </p>
        <p>
          <strong className="text-[color:var(--foreground)]">Logs.</strong> We maintain operational,
          security, and interaction logs (including authentication events, rate-limit triggers, and
          dashboard actions) to secure the platform and help you debug issues.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">
          2. How we use information
        </h2>
        <p>We use collected information to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Provide, maintain, and improve the service</li>
          <li>Authenticate users and deliver protected scripts to licensed end users</li>
          <li>Enforce plan limits, rate limits, and security policies you configure</li>
          <li>Send transactional email (verification, password reset, security notices)</li>
          <li>Operate Discord bot features you enable</li>
          <li>Detect abuse, fraud, and violations of our Terms</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>We do not sell your scripts or use them to train third-party AI models. We do not sell personal information to advertisers.</p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">
          3. How we share information
        </h2>
        <p>We share information only as needed to operate the service:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-[color:var(--foreground)]">Infrastructure:</strong> hosting and database providers</li>
          <li><strong className="text-[color:var(--foreground)]">Email:</strong> transactional email providers for platform mail</li>
          <li><strong className="text-[color:var(--foreground)]">Obfuscation:</strong> providers when you request protection</li>
          <li><strong className="text-[color:var(--foreground)]">Discord:</strong> when you use bot or OAuth features</li>
          <li><strong className="text-[color:var(--foreground)]">Webhooks:</strong> endpoints you configure to receive events from your projects</li>
          <li><strong className="text-[color:var(--foreground)]">Legal:</strong> when required by law or to protect rights, safety, and security</li>
        </ul>
        <p>Team members you invite may access project data according to the permissions you grant.</p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">
          4. Cookies and local storage
        </h2>
        <p>
          Essential cookies (session, login, security) are required for the product to work and are
          always on. We use cookies and similar technologies for:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-[color:var(--foreground)]">Session cookie:</strong> keeps you signed in to the dashboard (essential)</li>
          <li><strong className="text-[color:var(--foreground)]">Two-factor and OAuth cookies:</strong> short-lived state during login (essential)</li>
          <li><strong className="text-[color:var(--foreground)]">Device fingerprint cookie:</strong> signup abuse prevention when enabled (essential security)</li>
          <li><strong className="text-[color:var(--foreground)]">Theme preferences:</strong> accent and appearance in local storage (preference)</li>
        </ul>
        <p>
          We do not sell personal information. Project Discord webhooks you configure send only
          minimal event alerts (masked key, executor name, short IP hash) — not raw IPs or HWIDs.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">5. Data retention</h2>
        <p>
          We retain account and project data while your account is active. You may delete projects,
          scripts, keys from your dashboard. When you delete content or close your account, we
          remove or anonymize data within a reasonable period, except where retention is required for
          security, fraud prevention, or legal compliance.
        </p>
        <p>
          Loader sessions, execution logs, and security events may be retained for a limited period
          for analytics and abuse investigation, then purged or aggregated.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">6. Security</h2>
        <p>
          We use industry-standard measures including HTTPS encryption, hashed passwords, hashed API
          keys, and access controls. No method of transmission or storage is completely secure; you
          use the service at your own risk and should protect your credentials.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">
          7. Your choices and rights
        </h2>
        <p>
          You can update your profile, turn integrations on or off, and control what your projects
          collect from end users (within the features we provide). If you&apos;re in the EEA/UK or
          another region with similar laws, you may have rights to access, correct, delete, export,
          or restrict processing of personal data, and to object to certain processing. Contact us
          to submit a request — we may need to verify your identity.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">8. Children</h2>
        <p>
          LuaMore is not directed at children under 13. We do not knowingly collect personal
          information from children under 13. If you believe a child has provided us data, contact
          us and we will take appropriate steps to delete it.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">
          9. International users
        </h2>
        <p>
          LuaMore is operated from the United States. If you access the service from other regions,
          your information may be processed in the United States and other countries where our
          providers operate, which may have different data-protection laws than your jurisdiction.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">
          10. Changes to this policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at
          the bottom of this page will change when we do. Material changes will be posted here;
          continued use after updates constitutes acceptance.
        </p>

        <h2 className="font-display text-2xl text-[color:var(--foreground)]">11. Contact</h2>
        <p>
          Privacy questions and data requests can be sent through our{" "}
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
          <Link to="/tos" className="underline" style={{ color: "var(--foreground)" }}>
            Terms of Service
          </Link>
          <Link to="/privacy" className="underline" style={{ color: "var(--foreground)" }}>
            Privacy Policy
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
