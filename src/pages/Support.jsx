import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'

const BMAC_LINK = 'https://buymeacoffee.com/abidinganchor'

export default function Support() {
  const { user } = useAuth()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  useEffect(() => {
    setNotificationsEnabled(localStorage.getItem(userStorageKey(user?.id, 'support-browser-notifications')) === 'enabled')
  }, [user?.id])

  const handleNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Your browser does not support notifications')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      new Notification('AbidingAnchor', {
        body: 'You will now receive daily verse notifications! 🙏',
        icon: '/icon-192x192.png',
      })
      localStorage.setItem(userStorageKey(user?.id, 'support-browser-notifications'), 'enabled')
      setNotificationsEnabled(true)
    } else {
      alert('Notifications blocked. Please enable them in your browser settings.')
    }
  }

  return (
    <div style={{ position:'relative', zIndex: 10, minHeight:'100vh', 
      overflow:'hidden', fontFamily:'sans-serif' }}>
      <div className="content-scroll" style={{ padding:'0 16px', paddingTop:'60px', paddingBottom:'120px', maxWidth:'680px', margin:'0 auto', width:'100%' }}>

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

        <div className="glass-panel" style={{ borderRadius:'20px',
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

        <div className="glass-panel" style={{
          padding:'14px 16px', marginBottom:'20px',
          borderLeft:'3px solid rgba(255,220,80,0.55)',
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

        <section style={{ marginBottom: '14px' }}>
          <h2 style={{ color: '#D4A843', fontSize: '13px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.06em' }}>
            Daily Notifications
          </h2>
          <article className="glass-panel" style={{ borderRadius: '16px', padding: '14px 16px' }}>
            <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: '12px', margin: '0 0 10px' }}>
              Receive a gentle daily reminder to spend time in the Word.
            </p>
            <button
              type="button"
              onClick={handleNotifications}
              style={{ border: '1px solid rgba(212,168,67,0.6)', borderRadius: '10px', padding: '10px 12px', background: notificationsEnabled ? 'rgba(40,120,70,0.4)' : '#D4A843', color: notificationsEnabled ? '#fff' : '#1a1a1a', fontWeight: 700, fontSize: '13px' }}
            >
              {notificationsEnabled ? 'Notifications On ✅' : 'Enable Daily Notifications 🔔'}
            </button>
          </article>
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
            className="glass-panel"
            style={{ borderRadius:'16px',
              padding:'14px 18px', marginBottom:'10px',
              cursor:'pointer', display:'flex',
              alignItems:'center', gap:'14px',
              textDecoration:'none',
              background: 'rgba(255, 255, 255, 0.4)',
              border: '1px solid #D4A843',
              color: '#1a1a2e',
            }}>
            <div style={{ background:'#D4A843',
              border:'1px solid #D4A843',
              borderRadius:'12px', padding:'8px 14px',
              minWidth:'52px', textAlign:'center' }}>
              <div style={{ color:'#1a1a2e', fontSize:'18px',
                fontWeight:'bold' }}>{tier.amount}</div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ color:'#1a1a2e', fontSize:'14px',
                fontWeight:'600' }}>{tier.label}</div>
              <div style={{ color:'#1a1a2e',
                fontSize:'12px', marginTop:'2px' }}>{tier.desc}</div>
            </div>
            <div style={{ color:'#1a1a2e',
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
