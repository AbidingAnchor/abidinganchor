import { useEffect } from 'react'

export default function TermsOfService() {
  useEffect(() => {
    document.title = 'Terms of Service — AbidingAnchor'
  }, [])

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{ padding: '0 16px', paddingTop: '220px', paddingBottom: '120px', maxWidth: '680px', margin: '0 auto', width: '100%' }}
      >
        <section className="space-y-4">
          <header className="space-y-1 text-center">
            <h1 className="text-3xl font-bold text-white" style={{ textShadow: '0 1px 8px rgba(0,60,120,0.4)' }}>Terms of Service</h1>
            <p className="text-sm text-white/80">Last Updated: March 26, 2026</p>
          </header>

          <article className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md text-white/90 space-y-4">
            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>I. Acceptance of Terms</h2>
              <p>By accessing or using AbidingAnchor (the &quot;Service&quot;), you agree to be bound by these Terms. If you do not agree, please do not use the Service.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>II. Non-Commercial Ministry Nature</h2>
              <p>This Service is a free religious tool provided for spiritual and educational purposes. It is a ministry project, not a commercial product.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>III. &quot;As-Is&quot; &amp; No Warranties</h2>
              <p>The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. We expressly disclaim all warranties, whether express or implied, including the implied warranties of merchantability or fitness for a particular purpose. We do not guarantee that the Bible text or devotional content will be error-free.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>IV. Content &amp; Intellectual Property</h2>
              <p>- Scripture: The World English Bible (WEB) text used in this app is in the Public Domain.</p>
              <p>- App Proprietary Rights: The software code, original design, and App name &quot;AbidingAnchor&quot; are the property of AbidingAnchor and are protected by copyright laws.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>V. Donation Terms</h2>
              <p>Donations made via Buy Me a Coffee are voluntary gifts to support the ministry. Donations do not entitle you to any ownership, specific features, or service level agreements. All donations are final and non-refundable.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>VI. Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, AbidingAnchor shall not be liable for any direct, indirect, or incidental damages resulting from your use of the Service, including but not limited to data loss or device failure.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>VII. Governing Law</h2>
              <p>These Terms are governed by the laws of the Commonwealth of Pennsylvania, USA, without regard to its conflict of law principles.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>VIII. 2026 Compliance Signals</h2>
              <p>For app-store compliance in 2026, AbidingAnchor may receive anonymized age-category signals from Apple and Google Play to ensure age-appropriate app experiences. These signals are not stored on our servers and are not used for profiling or advertising.</p>
            </section>
          </article>
        </section>
      </div>
    </div>
  )
}
