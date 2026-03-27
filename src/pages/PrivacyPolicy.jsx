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
            <p className="text-sm text-white/80">Last Updated: March 27, 2026</p>
          </header>

          <article className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md text-white/90 space-y-4">
            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>I. Introduction &amp; Scope</h2>
              <p>AbidingAnchor (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) handles information as described in this Privacy Policy. This policy applies globally to all users of our Bible application. We are committed to a &quot;Privacy by Design&quot; approach, meaning we aim to collect the absolute minimum data necessary to function.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>II. Information Collection &amp; Use</h2>
              <p>To provide personalized features such as syncing your notes, prayers, journal entries, and reading progress across devices, we collect the following information when you create an account: Email Address (used to identify your account), Password (stored securely and encrypted by Supabase - we never see your actual password), and Full Name (optional, used to personalize your experience). This data is processed through Supabase, our secure third-party authentication and database provider at supabase.com. User-generated content including journal entries, prayers, highlights, and reading progress is stored securely on Supabase servers solely to provide the Service to you. We do not sell, share, or use this data for advertising purposes.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>III. Data Storage</h2>
              <p>User-generated content (journal entries, prayers, highlights, and reading progress) is stored securely on our servers via Supabase to allow access across multiple devices. App preferences such as scenery mode and notification settings remain stored locally on your device and never leave it. All data transmitted between your device and our servers is encrypted using industry-standard HTTPS.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>IV. Content &amp; Intellectual Property</h2>
              <p>The App contains a link to Buy Me a Coffee. If you click this link, you are subject to the Buy Me a Coffee Privacy Policy. We do not receive your credit card or financial details.</p>
              <p>You retain full ownership of any notes, prayers, or journal entries you create in AbidingAnchor. By using the account sync feature, you grant AbidingAnchor a limited, non-exclusive license to host and store this content on secure servers solely for the purpose of providing the Service to you. We will never read, analyze, share, or use your personal journal or prayer content for any purpose other than delivering it back to you.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>V. Your Rights &amp; Account Deletion</h2>
              <p>You have the following rights regarding your personal data. We will respond to any verified request to exercise these rights within 45 days. If we require an extension (up to an additional 45 days) for complex requests, we will notify you within the initial period.</p>
              <p>Access &amp; Portability: You can view your data within the app or request a portable copy of all personal information we have collected about you since January 1, 2022.</p>
              <p>Correction: You can update your name and email directly in your account settings at any time.</p>
              <p>Deletion: You have the right to permanently delete your account and all associated data. You can do this via App Settings by tapping &quot;Delete My Account&quot; or by emailing us. Deletion is irreversible.</p>
              <p>Opt-Out of Profiling: We do not sell your data or use it for targeted advertising. However, we honor Universal Opt-Out Mechanisms (such as Global Privacy Control) as valid requests to limit data processing.</p>
              <p>Right to Appeal (PCDPA &amp; CCPA/CPRA): If we decline to take action on your data request, we will provide our reasoning within 45 days. You have the right to appeal our decision by contacting us at AbidingAnchor@outlook.com with the subject &apos;Privacy Appeal&apos;. We will respond to your appeal in writing within 60 days. If the appeal is denied, Pennsylvania residents may contact the Pennsylvania Office of Attorney General.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>VI. Data Security</h2>
              <p>We use industry-standard HTTPS encryption for all connections between your device and our servers. Passwords are never stored in plain text - they are hashed and encrypted by Supabase. We collect only the minimum data necessary to provide the Service. AbidingAnchor is not liable for any loss or damage arising from your failure to protect your login credentials.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>VII. Contact Information</h2>
              <p>For any privacy-related inquiries, contact: AbidingAnchor@outlook.com</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>VIII. Children&apos;s Privacy</h2>
              <p>AbidingAnchor is not directed at children under the age of 13. Users must be at least 13 years old to create an account. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has created an account, we will immediately delete their account and all associated data. Parents or guardians who believe their child has registered may contact us at AbidingAnchor@outlook.com. In compliance with 2026 state laws (PA, TX, UT), we may receive anonymized age-category signals from the App Store to ensure an age-appropriate experience.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>IX. User Accounts &amp; Privacy</h2>
              <p>IX. User Accounts &amp; Privacy. To access personalized features, you may create a free account. By creating an account you agree to: (1) Accuracy - you will provide a valid email address and accurate registration information. (2) Security - you are solely responsible for maintaining the confidentiality of your password and for all activity that occurs under your account. Notify us immediately of any unauthorized access at AbidingAnchor@outlook.com. (3) Account Deletion - you may permanently delete your account and all associated data at any time through App Settings or by contacting AbidingAnchor@outlook.com. Deletion is irreversible. (4) Age Requirement - you must be at least 13 years old to create an account. (5) Third Party Processor - your account data is processed and stored by Supabase (supabase.com) under their privacy policy and security standards.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>X. Disclaimer of Warranties</h2>
              <p>X. Disclaimer of Warranties. AbidingAnchor is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted access, accuracy of third-party Bible content, or fitness for any particular purpose. We are not responsible for data loss or device failure. This Service is for spiritual enrichment purposes only and does not provide professional medical, legal, financial, or psychological counseling. Always seek qualified professional advice for such matters.</p>
            </section>
          </article>
        </section>
      </div>
    </div>
  )
}
