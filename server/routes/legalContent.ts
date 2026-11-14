/**
 * Corper Wee: Authoritative Privacy Policy & Terms of Service
 * Compliant with the Nigeria Data Protection Act (NDPA) and Google Play Data Safety requirements.
 */

export const LEGAL_EFFECTIVE_DATE = '2026-11-14';
export const LEGAL_CONTACT_EMAIL = 'farlodunolusege@gmail.com';

export interface LegalSection {
  heading: string;
  body: string[];
}

export const PRIVACY_POLICY: {
  title: string;
  effectiveDate: string;
  contactEmail: string;
  sections: LegalSection[];
} = {
  title: 'Corper Wee — Privacy Policy',
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  contactEmail: LEGAL_CONTACT_EMAIL,
  sections: [
    {
      heading: '1. Information We Collect',
      body: [
        'Account Identity: Email address, display name, and NYSC-format simulation State Code (e.g., OY/26C/5439) used strictly to uniquely identify your Corper Wee player profile and assign an orientation platoon.',
        'Gameplay & Progression Data: Avatar customization preferences, platoon scores, mini-game scores (Parade Drill, Canteen Rush, Soldier Evasion), hydration level, virtual wallet balances, and Mami Market inventory.',
        'Social & Moderation Records: Friend connections, social charisma scores, block lists, and player safety reports submitted to camp administrators.',
        'Technical & Crash Diagnostics: Anonymized HTTP latency metrics, device performance tier (LOW/MID/HIGH), and client runtime crash stack traces used exclusively for stability and performance tuning.',
      ],
    },
    {
      heading: '2. How We Use Your Data',
      body: [
        'Operate real-time multiplayer camp exploration, platoon leaderboards, and live camp events.',
        'Enforce fair play, anti-cheat server validation, idempotent virtual currency ledgers, and community safety.',
        'Maintain audit logs of administrative moderation actions and deliver bug fixes across Android and Web clients.',
      ],
    },
    {
      heading: '3. Data Retention & Account Deletion',
      body: [
        'When an account is deleted under our 90-day retention policy, personally identifiable information (email address, display name, and State Code) is immediately anonymized and scrubbed while non-identifiable financial ledger records are archived for anti-fraud integrity.',
        `You may request immediate account deletion or export by contacting the Data Protection Officer at ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      heading: '4. Security & Third-Party Sharing',
      body: [
        'We do not sell personal data or serve third-party behavioral advertising.',
        'All production traffic is encrypted in transit via HTTPS/WSS TLS 1.3, authenticated with rotated HMAC-SHA256 JWTs, and protected by strict role-based access controls.',
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: {
  title: string;
  effectiveDate: string;
  contactEmail: string;
  sections: LegalSection[];
} = {
  title: 'Corper Wee — Terms of Service',
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  contactEmail: LEGAL_CONTACT_EMAIL,
  sections: [
    {
      heading: '1. Fictional Simulation & Non-Affiliation Disclaimer',
      body: [
        'Corper Wee is an independent 3D life-simulation and social role-playing game inspired by orientation camp life in Iseyin, Oyo State, Nigeria.',
        'Corper Wee is NOT officially affiliated with, endorsed by, or operated by the National Youth Service Corps (NYSC) Directorate.',
      ],
    },
    {
      heading: '2. Virtual Currency & Items',
      body: [
        'Corper Points (CP) and Virtual Naira (₦) are strictly in-game simulation points with zero real-world monetary value.',
        'Virtual currencies and Mami Market items cannot be redeemed, withdrawn, transferred, or exchanged for legal tender outside the game.',
      ],
    },
    {
      heading: '3. Eligibility & Community Conduct',
      body: [
        'Players must provide a unique email and State Code pair and refrain from exploiting bugs, manipulating API requests, automating mini-game submissions, or harassing other players.',
        'Accounts violating community guidelines may be suspended or permanently removed by authorized Camp Administrators.',
      ],
    },
    {
      heading: '4. Service Availability & Updates',
      body: [
        'Camp events, economy conversion rates, market prices, and mini-game rewards may be updated dynamically by administrators to balance gameplay.',
        `For support, appeals, or legal notices, contact ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};

export function renderLegalDocumentHtml(doc: typeof PRIVACY_POLICY): string {
  const sectionsHtml = doc.sections
    .map(
      (sec) => `
      <section style="margin-bottom:24px;">
        <h2 style="font-size:18px;font-weight:700;color:#10b981;margin:0 0 8px 0;">${sec.heading}</h2>
        ${sec.body
          .map(
            (p) =>
              `<p style="margin:0 0 8px 0;line-height:1.6;color:#cbd5e1;font-size:14px;">${p}</p>`
          )
          .join('')}
      </section>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${doc.title}</title>
  </head>
  <body style="margin:0;background:#020617;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;padding:32px 16px;">
    <main style="max-width:760px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:32px;">
      <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#34d399;margin:0 0 6px 0;">Corper Wee Legal</p>
      <h1 style="font-size:26px;font-weight:800;margin:0 0 6px 0;">${doc.title}</h1>
      <p style="font-size:12px;color:#94a3b8;margin:0 0 28px 0;">Effective Date: ${doc.effectiveDate} &bull; Contact: ${doc.contactEmail}</p>
      ${sectionsHtml}
      <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;" />
      <p style="font-size:12px;color:#64748b;margin:0;">
        <a href="/legal/privacy" style="color:#34d399;text-decoration:none;margin-right:16px;">Privacy Policy</a>
        <a href="/legal/terms" style="color:#34d399;text-decoration:none;margin-right:16px;">Terms of Service</a>
        <a href="/" style="color:#94a3b8;text-decoration:none;">Return to Corper Wee</a>
      </p>
    </main>
  </body>
</html>`;
}
