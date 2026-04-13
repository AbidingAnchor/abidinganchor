import { useEffect } from 'react'

export default function TermsOfService() {
  useEffect(() => {
    document.title = 'Terms of Service — AbidingAnchor'
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
              Terms of Service
            </h1>
            <p className="text-sm text-white/80">Last Updated: April 13, 2026</p>
          </header>

          <article className="glass-panel rounded-2xl p-5 text-white/90 space-y-4">
            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                I. Acceptance of Terms
              </h2>
              <p>
                By accessing or using AbidingAnchor (the &quot;App&quot;), you agree to be bound by these Terms of Service
                (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the App.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                II. Description of Service
              </h2>
              <p>
                AbidingAnchor is a free Christian devotional application. Our services include daily Bible devotionals, a personal
                journal for entries and prayers, reading progress tracking, and access to third-party Bible-related video content.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                III. User Accounts and Responsibilities
              </h2>
              <p>To access certain features, you must create an account. You are responsible for:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-white/95">Security</strong> — maintaining confidentiality of credentials.
                </li>
                <li>
                  <strong className="text-white/95">Accuracy</strong> — providing truthful info during registration.
                </li>
                <li>
                  <strong className="text-white/95">Compliance</strong> — not violating laws or these Terms.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                IV. User-Generated Content
              </h2>
              <p>
                You retain ownership of content you create (journal entries, prayer requests). <strong className="text-white/95">License:</strong> you grant
                AbidingAnchor a non-exclusive, royalty-free, worldwide license to host/store content solely to provide the Service.
                You are solely responsible for your content and backups.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                V. YouTube API Services &amp; BibleProject Content
              </h2>
              <p>
                App uses YouTube API Services. Users agree to the{' '}
                <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  YouTube Terms of Service
                </a>{' '}
                and{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  Google Privacy Policy
                </a>
                . Users can revoke access via{' '}
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  Google Security Settings
                </a>
                .
              </p>
              <p>
                BibleProject content is used with permission — users may not edit, modify, profit from, or bypass DRM on that
                content.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                VI. Intellectual Property
              </h2>
              <p>
                All App materials (excluding user content and third-party resources like BibleProject or Bible translations) are
                property of AbidingAnchor or its licensors.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                VII. Disclaimer of Warranties
              </h2>
              <p>
                Provided &quot;AS IS&quot; and &quot;AS AVAILABLE.&quot; No warranty of uninterrupted or error-free service. No responsibility for
                user conduct or third-party content accuracy.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                VIII. Limitation of Liability
              </h2>
              <p>
                Not liable for indirect, incidental, or consequential damages including data loss or reliance on content provided
                for spiritual enrichment.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                IX. COPPA Compliance
              </h2>
              <p>
                Must be 13+ to use. We do not knowingly collect data from children under 13. If discovered, it will be deleted
                promptly.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                X. Termination of Accounts
              </h2>
              <p>We may terminate or suspend access at any time. Users may delete their account through App settings.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                XI. Changes to Terms
              </h2>
              <p>Terms may be updated with reasonable notice. Continued use after changes = acceptance.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                XII. Governing Law
              </h2>
              <p>Laws of the State of Pennsylvania, United States.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>
                Contact
              </h2>
              <p>
                Email:{' '}
                <a href="mailto:abidingstudiosdev@gmail.com" style={linkStyle}>
                  abidingstudiosdev@gmail.com
                </a>{' '}
                — Location: Philadelphia, Pennsylvania, United States
              </p>
            </section>
          </article>
        </section>
      </div>
    </div>
  )
}
