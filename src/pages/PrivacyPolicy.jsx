import { useEffect } from 'react'

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = 'Privacy Policy — AbidingAnchor'
  }, [])

  const linkStyle = { color: '#D4A843', textDecoration: 'underline', wordBreak: 'break-all' }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{ padding: '0 16px', paddingTop: '220px', paddingBottom: '120px', maxWidth: '680px', margin: '0 auto', width: '100%' }}
      >
        <section className="space-y-4">
          <header className="space-y-1 text-center">
            <h1 className="text-3xl font-bold text-white" style={{ textShadow: '0 1px 8px rgba(0,60,120,0.4)' }}>
              Privacy Policy
            </h1>
            <p className="text-sm text-white/80">Last Updated: April 13, 2026</p>
          </header>

          <article className="glass-panel rounded-2xl p-5 text-white/90 space-y-4">
            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                I. Introduction &amp; Scope
              </h2>
              <p>
                AbidingAnchor (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) handles information as described in this Privacy Policy.
                This policy applies globally to all users of our Bible application. We are committed to a &quot;Privacy by Design&quot;
                approach, meaning we aim to collect the absolute minimum data necessary to function.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                II. Third-Party Services &amp; YouTube API
              </h2>
              <p>Our app uses YouTube API Services to provide video content (e.g., BibleProject videos).</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-white/95">Agreement to Terms:</strong> By using this app, you agree to be bound by the
                  YouTube Terms of Service (
                  <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                    youtube.com/t/terms
                  </a>
                  ).
                </li>
                <li>
                  <strong className="text-white/95">Google Privacy Policy:</strong> Your use of YouTube features is also subject to
                  the Google Privacy Policy (
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                    policies.google.com/privacy
                  </a>
                  ).
                </li>
                <li>
                  <strong className="text-white/95">Access &amp; Revocation:</strong> You can manage or revoke AbidingAnchor&apos;s
                  access to your YouTube/Google data via the Google Security Settings page (
                  <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                    myaccount.google.com/permissions
                  </a>
                  ).
                </li>
                <li>
                  <strong className="text-white/95">Data Access:</strong> We access YouTube video metadata (titles, thumbnails, and
                  IDs) to display videos. We do not store personal YouTube account information or share it with third parties.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                III. Information Collection &amp; Use
              </h2>
              <p>
                To provide personalized features such as syncing your notes, prayers, journal entries, and reading progress across
                devices, we collect the following information when you create an account: Email Address (used to identify your
                account), Password (stored securely and encrypted by Supabase - we never see your actual password), and Full Name
                (optional, used to personalize your experience). This data is processed through Supabase, our secure third-party
                authentication and database provider at{' '}
                <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  supabase.com
                </a>
                . User-generated content including journal entries, prayers, highlights, and reading progress is stored securely on
                Supabase servers solely to provide the Service to you. We do not sell, share, or use this data for advertising
                purposes.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                IV. Data Storage
              </h2>
              <p>
                User-generated content (journal entries, prayers, highlights, and reading progress) is stored securely on our servers
                via Supabase to allow access across multiple devices. App preferences such as scenery mode and notification settings
                remain stored locally on your device and never leave it. All data transmitted between your device and our servers is
                encrypted using industry-standard HTTPS.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                V. Legal Basis &amp; International Data Transfers (GDPR)
              </h2>
              <p>
                For users in the EU/UK, we process your data based on contractual necessity to provide you with the Service. Your
                data is stored on servers in the United States via Supabase. We ensure your data is protected using Standard
                Contractual Clauses. As Data Controller, AbidingAnchor is responsible for your data. You have the right to access,
                port, correct, or delete your data by contacting us at the email below.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                VI. Content &amp; Intellectual Property
              </h2>
              <p>
                The App contains a link to Buy Me a Coffee. If you click this link, you are subject to the Buy Me a Coffee Privacy
                Policy. We do not receive your credit card or financial details. You retain full ownership of any notes, prayers, or
                journal entries you create in AbidingAnchor. By using the account sync feature, you grant AbidingAnchor a limited,
                non-exclusive license to host and store this content on secure servers solely for the purpose of providing the
                Service to you. We will never read, analyze, share, or use your personal journal or prayer content for any purpose
                other than delivering it back to you.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                VII. Your Rights &amp; Account Deletion
              </h2>
              <p>You have the following rights regarding your personal data. We will respond to any verified request within 45 days.</p>
              <p>
                <strong className="text-white/95">Access &amp; Portability:</strong> You can view your data within the app or request
                a portable copy of all personal information we have collected about you since January 1, 2022.
              </p>
              <p>
                <strong className="text-white/95">Correction:</strong> You can update your name and email directly in your account
                settings at any time.
              </p>
              <p>
                <strong className="text-white/95">Deletion:</strong> You have the right to permanently delete your account and all
                associated data via App Settings or by emailing us. Deletion is irreversible.
              </p>
              <p>
                <strong className="text-white/95">Opt-Out of Profiling:</strong> We do not sell your data or use it for targeted
                advertising.
              </p>
              <p>
                <strong className="text-white/95">Right to Appeal:</strong> If we decline to take action on your data request, you
                have the right to appeal by contacting us with the subject &quot;Privacy Appeal&quot;. Pennsylvania residents may
                contact the Pennsylvania Office of Attorney General.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                VIII. Data Security
              </h2>
              <p>
                We use industry-standard HTTPS encryption for all connections. Passwords are never stored in plain text - they are
                hashed and encrypted by Supabase. We collect only the minimum data necessary to provide the Service.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                IX. Children&apos;s Privacy (COPPA)
              </h2>
              <p>
                AbidingAnchor is not directed at children under the age of 13. Users must be at least 13 years old to create an
                account. We do not knowingly collect personal information from children under 13. If we discover that a child under 13
                has created an account, we will immediately delete their account and all associated data. Parents or guardians who
                believe their child has registered may contact us at{' '}
                <a href="mailto:abidingstudiosdev@gmail.com" style={linkStyle}>
                  abidingstudiosdev@gmail.com
                </a>
                .
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                X. User Accounts &amp; Privacy
              </h2>
              <p>
                To access personalized features, you may create a free account. By creating an account you agree to: (1){' '}
                <strong className="text-white/95">Accuracy</strong> - provide a valid email address and accurate registration
                information. (2) <strong className="text-white/95">Security</strong> - you are solely responsible for maintaining the
                confidentiality of your password. (3) <strong className="text-white/95">Account Deletion</strong> - you may permanently
                delete your account at any time through App Settings or by contacting us. (4){' '}
                <strong className="text-white/95">Age Requirement</strong> - you must be at least 13 years old. (5){' '}
                <strong className="text-white/95">Third Party Processor</strong> - your account data is processed and stored by
                Supabase (
                <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  supabase.com
                </a>
                ).
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                XI. Disclaimer of Warranties
              </h2>
              <p>
                AbidingAnchor is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted access,
                accuracy of third-party Bible content, or fitness for any particular purpose. This Service is for spiritual
                enrichment purposes only and does not provide professional medical, legal, financial, or psychological counseling.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                XII. Contact Information
              </h2>
              <p>
                Email:{' '}
                <a href="mailto:abidingstudiosdev@gmail.com" style={linkStyle}>
                  abidingstudiosdev@gmail.com
                </a>
              </p>
              <p>Location: Philadelphia, Pennsylvania, United States</p>
            </section>
          </article>
        </section>
      </div>
    </div>
  )
}
