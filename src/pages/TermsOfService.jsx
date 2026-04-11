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
            <p className="text-sm text-white/80">Last Updated: March 27, 2026</p>
          </header>

          <article className="glass-panel rounded-2xl p-5 text-white/90 space-y-4">
            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>I. Acceptance of Terms</h2>
              <p>By accessing or using AbidingAnchor (the &quot;Service&quot;), you agree to be bound by these Terms. If you do not agree, please do not use the Service.</p>
              <p>We have updated these terms as of March 27, 2026 to reflect the addition of user accounts and data synchronization features.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>II. Use of Service</h2>
              <p>This Service is a free religious tool provided for spiritual and educational purposes. It is a ministry project, not a commercial product.</p>
              <p>You must be at least 13 years old to use AbidingAnchor. By creating an account you represent that you meet this age requirement.</p>
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
              <p>AbidingAnchor is not liable for any loss or damage arising from your failure to protect your login credentials, unauthorized access to your account resulting from your own negligence, or loss of data resulting from account deletion initiated by you.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>VII. Tiers &amp; Support</h2>
              <p>Tiers and perks are provided as a voluntary &quot;thank you&quot; and may be modified or removed at our discretion. All donations are final and non-refundable. Tier benefits do not constitute a service level agreement or contractual obligation of any kind.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>VIII. 2026 Compliance Signals</h2>
              <p>For app-store compliance in 2026, AbidingAnchor may receive anonymized age-category signals from Apple and Google Play to ensure age-appropriate app experiences. These signals are not stored on our servers and are not used for profiling or advertising.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>IX. User Accounts &amp; Security</h2>
              <p>IX. User Accounts &amp; Security. (1) Account Creation: You may create a free account to access personalized features. You agree to provide accurate information and keep it updated. (2) Account Security: You are solely responsible for maintaining the confidentiality of your password and all activity under your account. AbidingAnchor is not liable for any loss arising from unauthorized use of your account due to your failure to protect your credentials. Notify us immediately of any unauthorized use at AbidingAnchor@outlook.com. (3) Account Deletion: You may delete your account and all associated data at any time through App Settings or by contacting AbidingAnchor@outlook.com. Deletion is permanent and irreversible. All your journal entries, prayers, highlights, and progress will be permanently removed. If a request for data access or deletion is denied, you have the right to appeal as outlined in our Privacy Policy. (4) Termination by Us: AbidingAnchor reserves the right to suspend or permanently terminate any account that violates these Terms, is used for fraudulent activity, illegal purposes, or any activity that harms the integrity of the Service. (5) Prohibited Conduct: You agree not to scrape or harvest data from AbidingAnchor, attempt to gain unauthorized access to other users&apos; accounts, use the Service for any illegal purpose, or interfere with the normal operation of the Service.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>X. User Generated Content</h2>
              <p>X. User Generated Content. You retain full ownership of all journal entries, prayers, notes, and other content you create in AbidingAnchor. By using the account sync feature, you grant AbidingAnchor a limited, non-exclusive, royalty-free license to store and transmit your content solely for the purpose of providing the Service to you. We will never read, sell, share, or use your personal spiritual content for any other purpose. You are responsible for the content you create. By creating an account and inputting personal prayers or journal entries, you acknowledge that you are voluntarily providing sensitive personal information (religious beliefs) and explicitly consent to its storage and processing for the sole purpose of syncing your account.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold" style={{ color: '#D4A843' }}>XI. Governing Law</h2>
              <p>XI. Governing Law &amp; Mandatory Arbitration. These Terms are governed by the laws of the Commonwealth of Pennsylvania, United States. PLEASE READ THIS CAREFULLY: By using AbidingAnchor, you agree that any dispute, claim, or controversy arising out of or relating to these Terms or your use of the Service shall be resolved exclusively through binding arbitration, rather than in court. Arbitration is less formal than a lawsuit in court, and there is no judge or jury. You waive your right to a jury trial and your right to participate in a class action lawsuit. Arbitration shall be conducted by a single arbitrator under the rules of the American Arbitration Association (AAA). The arbitration will take place in Pennsylvania, or via video/phone at your request. Nothing in this clause prevents either party from seeking emergency injunctive relief in a Pennsylvania court to prevent irreparable harm pending arbitration. If you do not agree to arbitration, do not use this Service.</p>
            </section>
          </article>
        </section>
      </div>
    </div>
  )
}
