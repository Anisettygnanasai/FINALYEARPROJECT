import React, { useRef } from 'react';
import { Camera, Utensils } from 'lucide-react';

// --- 1. DEFINE HEROCARD FIRST ---
const HeroCard = ({ icon: Icon, title, desc, onClick }) => {
  const ref = useRef(null);
  
  // Mouse spotlight effect logic
  const handleMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ref.current.style.setProperty("--mouse-x", `${x}px`);
    ref.current.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div 
      ref={ref} 
      onMouseMove={handleMove} 
      onClick={onClick} 
      className="glass-panel animate-in" 
      style={{ 
        width:'320px', 
        padding:'50px', 
        cursor:'pointer', 
        textAlign:'center', 
        display:'flex', 
        flexDirection:'column', 
        alignItems:'center', 
        gap:'20px' 
      }}
    >
      <Icon size={64} color="var(--primary-glow)" />
      <h2 style={{ fontSize:'2rem', margin:0, color:'#fff' }}>{title}</h2>
      <p style={{ color:'#aaa', fontSize:'1.1rem' }}>{desc}</p>
    </div>
  );
};

// --- 2. DEFINE LANDINGPAGE SECOND ---
const LandingPage = ({ setView }) => (
  <div style={{ textAlign:'center', marginTop:'10vh' }}>
    <h1 style={{ 
      fontSize:'5rem', 
      margin:'0 0 20px 0', 
      background:'linear-gradient(to right, #fff, #999)', 
      WebkitBackgroundClip:'text', 
      WebkitTextFillColor:'transparent', 
      letterSpacing:'-2px' 
    }}>
      The Future of Dining
    </h1>
    <p style={{ fontSize:'1.3rem', color:'#888', marginBottom:'70px' }}>
      Experience AI-curated culinary perfection.
    </p>
    
    <div style={{ display:'flex', justifyContent:'center', gap:'50px', flexWrap:'wrap' }}>
      {/* 3. UPDATED LINK: Goes to 'ai-age' (Step 1) instead of 'ai-camera' */}
      <HeroCard 
        icon={Camera} 
        title="Ask AI Chef" 
        desc="Scan your mood for the perfect meal" 
        onClick={() => setView('ai-age')} 
      />
      
      <HeroCard 
        icon={Utensils} 
        title="Full Menu" 
        desc="Explore our master collection" 
        onClick={() => setView('menu')} 
      />
    </div>
  </div>
);

export default LandingPage;