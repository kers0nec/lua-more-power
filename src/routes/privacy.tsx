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
    <PageShell eyebrow="Legal" title="Privacy Policy" subtitle="Last updated: August 29, 2026">
      <article className="space-y-6 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
        <p>
          This Privacy Policy explains how LuaMore (&quot;we,&quot; &quot;us&quot;) collects, uses,
          stores, and shares information when you use LuaMore, our dashboard, loader runtime, Discord
          integrations, and related APIs. It should be read together with our{" "}
          <Link to="/tos" className="underline" style={{ color: "var(--foreground)" }}>
            Terms of Service
          </Link>
          .
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">1. Information we collect</h2>
        <p>
          <strong className="text-[color:var(--foreground)]">Account and profile.</strong> When you
          register, we collect your email address, display name / username, and a hashed password. We
          record when you accept these Terms and our Privacy Policy. Email is used for account recovery
          and key delivery notices.
        </p>
        <p>
          Optional Discord sign-in may store your Discord user ID, username, display name, and
          configuration for panels and key redemption flows you enable.
        </p>
        <p>
          <strong className="text-[color:var(--foreground)]">Projects, scripts, and keys.</strong> We
          store projects, scripts, obfuscated outputs, license keys, key metadata, HWID hashes you bind
          to keys, and settings you configure.
        </p>
        <p>
          <strong className="text-[color:var(--foreground)]">Loader and runtime activity.</strong> When
          end users run your loader, we process technical data needed to authenticate and deliver
          scripts, including hashed hardware identifiers where configured, executor name, session
          nonces, and delivery telemetry.
        </p>
        <p>
          LuaMore does not process payments and does not store payment card numbers.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">2. How we use information</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Provide, maintain, and improve the service</li>
          <li>Authenticate users and deliver protected scripts to licensed end users</li>
          <li>Send transactional email (verification, password reset, security notices)</li>
          <li>Operate Discord bot features you enable</li>
          <li>Detect abuse, fraud, and violations of our Terms</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>We do not sell your scripts or use them to train third-party AI models.</p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">3. How we share information</h2>
        <p>
          We share information only as needed to operate the service: infrastructure and database
          providers, Discord when you use bot or OAuth features, webhooks you configure, and when
          required by law.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">4. Cookies and local storage</h2>
        <p>
          Essential cookies (session, login, security) are required for the product to work. Theme
          preferences may be stored in local storage. We do not run optional advertising cookies.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">5. Data retention</h2>
        <p>
          We retain account and project data while your account is active. You may delete projects,
          scripts, and keys from your dashboard. When you delete content or close your account, we
          remove or anonymize data within a reasonable period, except where retention is required for
          security or legal compliance.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">6. Security</h2>
        <p>
          We use industry-standard measures including HTTPS encryption, hashed passwords, hashed API
          keys, and access controls. No method of transmission or storage is completely secure.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">7. Your choices and rights</h2>
        <p>
          You can update your profile name from Settings, keep or change your email through account
          recovery, and control what your projects collect from end users. Contact us through Discord to
          submit an access or deletion request.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">8. Children</h2>
        <p>
          LuaMore is not directed at children under 13. We do not knowingly collect personal information
          from children under 13.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">9. International users</h2>
        <p>
          If you access the service from other regions, your information may be processed in the United
          States and other countries where our providers operate.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">10. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date will
          change when we do.
        </p>
        <h2 className="font-display text-2xl text-[color:var(--foreground)]">11. Contact</h2>
        <p>
          Privacy questions and data requests can be sent through our{" "}
          <a href={DISCORD_SUPPORT} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--foreground)" }}>
            Discord server
          </a>
          .
        </p>
      </article>
    </PageShell>
  );
}
