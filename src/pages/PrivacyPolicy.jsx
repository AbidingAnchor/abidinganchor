import { useEffect } from 'react'

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = 'Privacy Policy — AbidingAnchor'
  }, [])

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{ padding: '0 16px', paddingTop: '220px', paddingBottom: '120px', maxWidth: '680px', margin: '0 auto', width: '100%' }}
      >
        <section className="space-y-4">
          <header className="space-y-1 text-center">
            <h1 className="text-3xl font-bold text-white" style={{ textShadow: '0 1px 8px rgba(0,60,120,0.4)' }}>Privacy Policy</h1>
            <p className="text-sm text-white/80">Effective Date: March 26, 2026</p>
          </header>

          <article className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md text-white/90 space-y-4">
            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>I. Introduction &amp; Scope</h2>
              <p>AbidingAnchor (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) handles information as described in this Privacy Policy. This policy applies globally to all users of our Bible application. We are committed to a &quot;Privacy by Design&quot; approach, meaning we aim to collect the absolute minimum data necessary to function.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>II. Information Collection &amp; Use</h2>
              <p>- Personal Data: We do not collect Personal Data as defined by the GDPR or CCPA (such as names, emails, or phone numbers). No account registration is required.</p>
              <p>- Sensitive Data: We do not collect or store sensitive religious information, prayer requests, or personal notes on our servers.</p>
              <p>- Technical Identifiers: When you use the App, your device connects to external APIs (bolls.life and bible-api.com) to fetch Bible text. These services temporarily receive your IP Address to fulfill the request. We do not store this IP address or link it to you.</p>
              <p>Technical Processing: While we do not collect or store your personal data, our third-party Bible API providers (bolls.life and bible-api.com) receive your device&apos;s IP Address temporarily to deliver scripture text as part of a standard internet request. We do not have access to this data, nor do we link it to any individual user.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>III. Local Storage &amp; Cookies</h2>
              <p>We do not use tracking cookies. We use localStorage on your device to save your preferences (e.g., last chapter read, journal entries). This data never leaves your device and you can delete it at any time by clearing your App data or uninstalling the App.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>IV. Third-Party Links &amp; Donations</h2>
              <p>The App contains a link to Buy Me a Coffee. If you click this link, you are subject to the Buy Me a Coffee Privacy Policy. We do not receive your credit card or financial details.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>V. Global Rights (GDPR &amp; CCPA)</h2>
              <p>Regardless of where you live, you have the right to:</p>
              <p>- Right to Know: Know what data we process (as outlined in this policy).</p>
              <p>- Right to Deletion: Since we store no data on our servers, deletion is managed by you clearing your device&apos;s cache/local storage.</p>
              <p>- Right to Opt-Out: We do not sell or share your personal information for advertising.</p>
              <p>Age-Verification Signals: In accordance with 2026 state laws in Pennsylvania, Texas, and Utah, we may receive anonymized age-category signals (e.g., Under 13, 13-17, 18+) from the Apple and Google Play stores. We use these signals solely to ensure the app experience is age-appropriate. We do not store, track, or share this age information on our servers.</p>
              <p>Pennsylvania Resident Rights: Under the PCDPA, Pennsylvania residents have the right to Confirm if we are processing data, Correct inaccuracies, and Delete any data. Since we store no data on our servers, these rights are fulfilled by you clearing your device&apos;s cache/local storage.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>VI. Children&apos;s Privacy (COPPA)</h2>
              <p>Our App is a general audience app. We do not knowingly collect personal information from children under 13.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>V. Global &amp; State Rights</h2>
              <p>Global &amp; State Rights: In accordance with the GDPR, CCPA, and the 2026 Pennsylvania Consumer Data Privacy Act (PCDPA), users have the right to confirm, correct, or delete their data. Since AbidingAnchor stores no personal data on its servers, these rights are fulfilled by the user clearing their own device&apos;s cache or localStorage.</p>
              <p>Tiers and perks are provided as a voluntary &quot;thank you&quot; and may be modified or removed at our discretion. All donations are final and non-refundable. Tier benefits do not constitute a service level agreement or contractual obligation of any kind.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>VI. Children&apos;s Privacy</h2>
              <p>Children&apos;s Privacy: We do not knowingly collect personal information from children under 13. In compliance with 2026 state laws (PA, TX, UT), we may receive anonymized age-category signals from the App Store to ensure an age-appropriate experience, but we do not store or track this information.</p>
              <p>This Service is for spiritual enrichment purposes only and does not provide professional medical, legal, financial, or psychological counseling. AbidingAnchor Ministry is not liable for any decisions made based on content within the app. Always seek qualified professional advice for medical, legal, or mental health concerns.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>VII. Contact Information</h2>
              <p>For any privacy-related inquiries, contact: AbidingAnchor@outlook.com</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>VIII. Data Security</h2>
              <p>We use industry-standard encryption (HTTPS) for all connections to external APIs to protect your reading activity in transit. As a &quot;Privacy by Design&quot; app, our primary security measure is that we never ask for or store the data that hackers typically target.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>IX. Disclaimer of Warranties</h2>
              <p>AbidingAnchor is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted access, accuracy of third-party Bible content, or fitness for any particular purpose. We are not responsible for data loss or device failure. Use of this app is at your own discretion.</p>
            </section>
          </article>
        </section>
      </div>
    </div>
  )
}
