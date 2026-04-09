import { useEffect, useState } from 'react'

export default function PremiumSkyBackground() {
  const [timeOfDay, setTimeOfDay] = useState('')
  
  // Generate stars once during initial render
  const [stars] = useState(() => 
    [...Array(50)].map((_, i) => ({
      id: i,
      top: `${Math.random() * 60}%`,
      left: `${Math.random() * 100}%`,
      width: `${Math.random() * 3 + 1}px`,
      height: `${Math.random() * 3 + 1}px`,
      animationDelay: `${Math.random() * 5}s`,
      opacity: Math.random() * 0.8 + 0.2
    }))
  )

  useEffect(() => {
    const updateTimeOfDay = () => {
      const hour = new Date().getHours()
      if (hour >= 5 && hour < 11) setTimeOfDay('morning')
      else if (hour >= 11 && hour < 17) setTimeOfDay('day')
      else if (hour >= 17 && hour < 20) setTimeOfDay('sunset')
      else setTimeOfDay('night')
    }

    updateTimeOfDay()
    const interval = setInterval(updateTimeOfDay, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  const getSkyGradient = () => {
    switch (timeOfDay) {
      case 'morning':
        return {
          gradient: 'linear-gradient(180deg, #FF6B6B 0%, #FFE66D 30%, #87CEEB 60%, #98D8E8 100%)',
          sunColor: '#FFD700',
          sunPosition: '15%',
          cloudColor: 'rgba(255, 255, 255, 0.7)',
          skyTop: '#FF6B6B',
          skyBottom: '#87CEEB'
        }
      case 'day':
        return {
          gradient: 'linear-gradient(180deg, #87CEEB 0%, #98D8E8 40%, #B0E0E6 70%, #E0F6FF 100%)',
          sunColor: '#FFD700',
          sunPosition: '20%',
          cloudColor: 'rgba(255, 255, 255, 0.8)',
          skyTop: '#87CEEB',
          skyBottom: '#E0F6FF'
        }
      case 'sunset':
        return {
          gradient: 'linear-gradient(180deg, #FF6B6B 0%, #FF8E53 20%, #FFD93D 40%, #6BCB77 60%, #4D96FF 100%)',
          sunColor: '#FF6347',
          sunPosition: '25%',
          cloudColor: 'rgba(255, 182, 193, 0.6)',
          skyTop: '#FF6B6B',
          skyBottom: '#4D96FF'
        }
      case 'night':
        return {
          gradient: 'linear-gradient(180deg, #0C1445 0%, #1E3A8A 30%, #312E81 60%, #1E1B4B 100%)',
          sunColor: '#F0E68C',
          sunPosition: '15%',
          cloudColor: 'rgba(200, 200, 255, 0.1)',
          skyTop: '#0C1445',
          skyBottom: '#1E1B4B'
        }
      default:
        return {
          gradient: 'linear-gradient(180deg, #87CEEB 0%, #E0F6FF 100%)',
          sunColor: '#FFD700',
          sunPosition: '20%',
          cloudColor: 'rgba(255, 255, 255, 0.8)',
          skyTop: '#87CEEB',
          skyBottom: '#E0F6FF'
        }
    }
  }

  const skyConfig = getSkyGradient()

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden">
      {/* Sky gradient background */}
      <div 
        className="absolute inset-0 transition-all duration-3000 ease-in-out"
        style={{ background: skyConfig.gradient }}
      />
      
      {/* Animated sun/moon */}
      <div 
        className="absolute w-24 h-24 rounded-full transition-all duration-3000 ease-in-out"
        style={{
          background: `radial-gradient(circle, ${skyConfig.sunColor} 0%, ${skyConfig.sunColor}88 40%, transparent 70%)`,
          top: timeOfDay === 'night' ? '60%' : '15%',
          left: skyConfig.sunPosition,
          transform: timeOfDay === 'night' ? 'scale(0.8)' : 'scale(1)',
          boxShadow: timeOfDay === 'night' 
            ? '0 0 40px rgba(240, 230, 140, 0.5)' 
            : '0 0 60px rgba(255, 215, 0, 0.6)',
          filter: timeOfDay === 'night' ? 'blur(1px)' : 'blur(0px)'
        }}
      />

      {/* Premium clouds */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Cloud 1 */}
        <div 
          className="absolute opacity-70 animate-pulse"
          style={{
            top: '20%',
            left: '10%',
            width: '200px',
            height: '80px',
            background: `radial-gradient(ellipse at center, ${skyConfig.cloudColor} 0%, transparent 70%)`,
            borderRadius: '50%',
            animation: 'float 20s infinite ease-in-out'
          }}
        />
        
        {/* Cloud 2 */}
        <div 
          className="absolute opacity-60 animate-pulse"
          style={{
            top: '30%',
            right: '15%',
            width: '180px',
            height: '60px',
            background: `radial-gradient(ellipse at center, ${skyConfig.cloudColor} 0%, transparent 70%)`,
            borderRadius: '50%',
            animation: 'float 25s infinite ease-in-out reverse'
          }}
        />

        {/* Cloud 3 */}
        <div 
          className="absolute opacity-50 animate-pulse"
          style={{
            top: '15%',
            left: '50%',
            width: '150px',
            height: '50px',
            background: `radial-gradient(ellipse at center, ${skyConfig.cloudColor} 0%, transparent 70%)`,
            borderRadius: '50%',
            animation: 'float 30s infinite ease-in-out'
          }}
        />
      </div>

      {/* Stars for night time */}
      {timeOfDay === 'night' && (
        <div className="absolute inset-0 pointer-events-none">
          {stars.map((star) => (
            <div
              key={star.id}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                top: star.top,
                left: star.left,
                width: star.width,
                height: star.height,
                animationDelay: star.animationDelay,
                opacity: star.opacity
              }}
            />
          ))}
        </div>
      )}

      {/* Atmospheric overlay for depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.2) 100%)'
        }}
      />

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(20px) translateY(-10px); }
          50% { transform: translateX(-10px) translateY(5px); }
          75% { transform: translateX(15px) translateY(-5px); }
        }
      `}</style>
    </div>
  )
}
