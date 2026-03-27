import { Link } from 'react-router-dom'

const BMAC_LINK = 'https://buymeacoffee.com/abidinganchor'

export default function Support() {
  return (
    <div style={{ position:'relative', minHeight:'100vh', 
      overflow:'hidden', fontFamily:'sans-serif' }}>
      <div style={{ padding:'0 16px', paddingTop:'200px', paddingBottom:'120px', maxWidth:'680px', margin:'0 auto', width:'100%' }}>

        <h1 style={{ textAlign:'center', color:'#fff', 
          fontSize:'26px', fontWeight:'bold', margin:'0 0 6px',
          textShadow:'0 2px 8px rgba(0,60,120,0.4)',
          fontFamily:'Georgia, serif' }}>
          Support This Ministry
        </h1>
        <p style={{ textAlign:'center', color:'rgba(255,255,255,0.85)',
          fontSize:'13px', margin:'0 0 20px',
          textShadow:'0 1px 4px rgba(0,60,120,0.3)' }}>
          Keeping the gospel free for everyone
        </p>

        <div style={{ background:'rgba(255,255,255,0.18)',
          backdropFilter:'blur(14px)', borderRadius:'20px',
          border:'1px solid rgba(255,255,255,0.45)',
          padding:'20px', marginBottom:'16px' }}>
          <p style={{ color:'#fff', fontSize:'14px', lineHeight:'1.8',
            textAlign:'center', margin:0, fontFamily:'Georgia,serif',
            fontStyle:'italic',
            textShadow:'0 1px 4px rgba(0,60,120,0.3)' }}>
            "AbidingAnchor was built as an act of worship to Jesus Christ. 
            Every verse, every prayer, every word of Scripture in 
            this app is a free gift — because the gospel belongs 
            to everyone. If AbidingAnchor has drawn you closer to God, 
            please consider supporting this mission so it can 
            keep growing and reach more hearts around the world."
          </p>
          <p style={{ textAlign:'center', color:'rgba(255,220,100,0.9)',
            fontSize:'12px', marginTop:'12px', fontWeight:'600',
            letterSpacing:'0.06em' }}>
            — Built in Jesus' name 🙏
          </p>
        </div>

        <div style={{ background:'rgba(255,255,255,0.12)',
          backdropFilter:'blur(10px)', borderRadius:'14px',
          border:'1px solid rgba(255,255,255,0.3)',
          padding:'14px 16px', marginBottom:'20px',
          borderLeft:'3px solid rgba(255,220,80,0.8)',
          borderRadius:'0 14px 14px 0' }}>
          <p style={{ color:'rgba(255,255,255,0.9)', fontSize:'13px',
            fontFamily:'Georgia,serif', fontStyle:'italic',
            lineHeight:'1.7', margin:'0 0 6px' }}>
            "Each one must give as he has decided in his heart, 
            not reluctantly or under compulsion, for God loves 
            a cheerful giver."
          </p>
          <p style={{ color:'rgba(255,220,80,0.9)', fontSize:'11px',
            fontWeight:'700', letterSpacing:'0.08em', margin:0 }}>
            2 CORINTHIANS 9:7
          </p>
        </div>

        <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'11px',
          fontWeight:'600', letterSpacing:'0.1em', 
          textTransform:'uppercase', textAlign:'center',
          marginBottom:'10px' }}>
          Choose how you'd like to give
        </p>

        <section style={{ marginBottom: '16px' }}>
          <h2 style={{ color: '#D4A843', fontSize: '13px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.06em' }}>
            Features
          </h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            <Link to="/ai-companion" style={{ textDecoration: 'none' }}>
              <article style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(14px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.4)', padding: '14px 16px' }}>
                <p style={{ color: '#D4A843', fontWeight: 700, margin: 0 }}>✦ AI Bible Companion</p>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: '4px 0 0' }}>Ask questions about any Scripture passage</p>
              </article>
            </Link>
            <Link to="/faith-journey" style={{ textDecoration: 'none' }}>
              <article style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(14px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.4)', padding: '14px 16px' }}>
                <p style={{ color: '#D4A843', fontWeight: 700, margin: 0 }}>✦ Faith Journey</p>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: '4px 0 0' }}>View your spiritual growth milestones</p>
              </article>
            </Link>
          </div>
        </section>

        {[
          { amount:'$3', label:'A Small Blessing', 
            desc:'Covers one day of server costs' },
          { amount:'$10', label:'A Faithful Gift', 
            desc:'Helps keep the app running for a week' },
          { amount:'$25', label:'A Ministry Partner', 
            desc:'Funds new features & spreading the Word' },
        ].map(tier => (
          <a key={tier.amount}
            href={BMAC_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background:'rgba(255,255,255,0.18)',
              backdropFilter:'blur(14px)', borderRadius:'16px',
              border:'1px solid rgba(255,255,255,0.4)',
              padding:'14px 18px', marginBottom:'10px',
              cursor:'pointer', display:'flex',
              alignItems:'center', gap:'14px',
              textDecoration:'none' }}>
            <div style={{ background:'rgba(255,210,60,0.25)',
              border:'1px solid rgba(255,210,60,0.5)',
              borderRadius:'12px', padding:'8px 14px',
              minWidth:'52px', textAlign:'center' }}>
              <div style={{ color:'#FFE066', fontSize:'18px',
                fontWeight:'bold' }}>{tier.amount}</div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ color:'#fff', fontSize:'14px',
                fontWeight:'600' }}>{tier.label}</div>
              <div style={{ color:'rgba(255,255,255,0.7)',
                fontSize:'12px', marginTop:'2px' }}>{tier.desc}</div>
            </div>
            <div style={{ color:'rgba(255,210,60,0.8)',
              fontSize:'20px' }}>›</div>
          </a>
        ))}

        <a href={BMAC_LINK}
          target="_blank"
          rel="noopener noreferrer"
          style={{ width:'100%', padding:'16px',
            background:'linear-gradient(135deg, #F0C040, #D4A020)',
            border:'none', borderRadius:'16px', color:'#1a0a00',
            fontSize:'16px', fontWeight:'700', cursor:'pointer',
            marginTop:'8px', letterSpacing:'0.02em',
            textDecoration:'none', display:'block', textAlign:'center' }}>
          Buy Me a Coffee ☕
        </a>

        <p style={{ textAlign:'center', 
          color:'rgba(255,255,255,0.55)', fontSize:'11px',
          marginTop:'16px', lineHeight:'1.6' }}>
          You'll be taken to Buy Me a Coffee to complete your gift.
          All donations go directly to maintaining and growing AbidingAnchor.
          Thank you for being part of this mission. 🙏
        </p>

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link to="/memorize" style={{ color: '#D4A843', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
            Memorize
          </Link>
          <Link to="/legal" style={{ color: '#D4A843', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
            Legal &amp; Privacy
          </Link>
          <Link to="/privacy" style={{ color: '#D4A843', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
            Privacy Policy
          </Link>
          <Link to="/terms" style={{ color: '#D4A843', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
            Terms of Service
          </Link>
        </div>

      </div>
    </div>
  )
}
