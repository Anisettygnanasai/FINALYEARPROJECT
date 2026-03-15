import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import MenuItem from './components/MenuItem';
import CartDrawer from './components/CartDrawer';
import AdminDashboard from './components/AdminDashboard';
import { QrCode, ArrowLeft, Star } from 'lucide-react';

const resolveApiBase = () => {
  const rawBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim();
  const withoutTrailingSlash = rawBase.replace(/\/+$/, '');
  return /\/api$/i.test(withoutTrailingSlash)
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api`;
};

const API_URL = resolveApiBase();

export default function App() {
  const [view, setView] = useState('landing');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [token, setToken] = useState(null);
  const [filterType, setFilterType] = useState('All'); 
  const [deviceMode, setDeviceMode] = useState('kiosk'); 

  const [trackInput, setTrackInput] = useState('');
  const [trackStatus, setTrackStatus] = useState(null);
  const [rateToken, setRateToken] = useState('');
  const [userRating, setUserRating] = useState(0);
  const webcamRef = useRef(null);
  const [ageInput, setAgeInput] = useState(25); 

  const [manualForm, setManualForm] = useState({ 
    mood: 'Happy', hunger: 'Medium', category: 'Any', spice: 'Low', type: 'Both' 
  });
  const [adminCreds, setAdminCreds] = useState({ id: '', password: '' });
  const [impactStats, setImpactStats] = useState({ total_charity: 0, total_orders: 0 });
  const [recentImpactStats, setRecentImpactStats] = useState({ recent_window: 5, recent_orders_count: 0, charity_orders_count: 0, recent_charity_amount: 0, recent_social_impact_count: 0 });
  const [menuLoadError, setMenuLoadError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/menu`)
      .then(r => {
        if (!r.ok) throw new Error(`Menu API failed (${r.status})`);
        return r.json();
      })
      .then(data => {
        setMenuItems(Array.isArray(data) ? data : []);
        setMenuLoadError('');
      })
      .catch((error) => {
        console.error(error);
        setMenuItems([]);
        setMenuLoadError(`Could not load menu. Check VITE_API_URL (current: ${API_URL}).`);
      });
    fetch(`${API_URL}/admin/stats`).then(r => r.json()).then(setImpactStats).catch(console.error);
    fetch(`${API_URL}/impact/recent`).then(r => r.json()).then(setRecentImpactStats).catch(console.error);
  }, [view]); 

  const getDeviceStyle = () => {
    const common = { transition: 'all 0.4s ease', margin: '20px auto', overflowY: 'auto', overflowX:'hidden' };
    if (deviceMode === 'phone') return { ...common, width: '375px', height: '800px', border: '12px solid #2a2a2a', borderRadius: '40px', background: '#000' };
    if (deviceMode === 'tablet') return { ...common, width: '768px', minHeight: '900px', border: '12px solid #2a2a2a', borderRadius: '24px' };
    return { ...common, width: '100%', maxWidth: '1400px', border: 'none' };
  };

  const getFilterStyle = (type) => {
    const isActive = filterType === type;
    let color = type === 'All' ? '#f1c40f' : type === 'Veg' ? '#2ecc71' : '#e74c3c';
    return { background: isActive ? `${color}22` : 'transparent', border: `1px solid ${isActive ? color : '#333'}`, color: isActive ? color : '#888', padding: '8px 24px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', fontSize: '0.85rem' };
  };

  const addToCart = (item) => setCart([...cart, item]);
  const removeFromCart = (item) => {
    const idx = cart.findLastIndex(i => i.id === item.id);
    if (idx > -1) { const newCart = [...cart]; newCart.splice(idx, 1); setCart(newCart); }
  };
  const getItemCount = (id) => cart.filter(i => i.id === id).length;

  const getGroupedMenu = () => {
    let filtered = menuItems;
    if (filterType !== 'All') filtered = menuItems.filter(i => i.type.toLowerCase() === filterType.toLowerCase());
    const grouped = {};
    filtered.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  };

  const getRecsByType = (type) => aiResult ? aiResult.recommendations.filter(i => i.type.toLowerCase() === type) : [];

  const handleManualSubmit = async () => {
    const res = await fetch(`${API_URL}/ai/manual`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ...manualForm, age: ageInput, preference: manualForm.type }) 
    });
    const data = await res.json();
    const hour = new Date().getHours();
    const displayWeather = (hour >= 17 || hour < 6) ? "Evening Breeze" : "Light Sunny";

    setAiResult({ 
        detected: { mood: manualForm.mood, age: ageInput, weather_desc: displayWeather }, 
        recommendations: data 
    });
    setView('ai-results');
  };

  const captureFace = async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    const res = await fetch(`${API_URL}/ai/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: imageSrc, age: ageInput }) });
    const data = await res.json();
    setAiResult(data); setView('ai-results');
  };

  const placeOrder = async (table) => {
    if (!table) return alert("Enter Table #");
    const res = await fetch(`${API_URL}/order/place`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ table, items: cart }) 
    });
    const data = await res.json();
    if(data.success) { 
        setToken(data.token);
        // NEW SOCIAL FEEDBACK INJECTED
        if(data.charity_earned > 0) {
            alert(`🌟 Social Impact: Your order contributed ₹${data.charity_earned} to charity! Token: ${data.token}`);
        }
        setCart([]); 
        setIsCartOpen(false); 
        setView('track'); 
    } else {
        alert(data.error || 'Unable to place order right now.');
    }
  };

  const checkStatus = async () => {
    if(!trackInput) return alert("Enter Token!");
    const res = await fetch(`${API_URL}/order/status/${trackInput}`);
    const data = await res.json();
    if(data.found) setTrackStatus(data); else alert("Order not found!");
  };

  const submitRating = async () => {
      if(!rateToken || userRating === 0) return alert("Enter Token & Star Rating");
      await fetch(`${API_URL}/order/rate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: rateToken, rating: userRating })
      });
      alert("Thank you for your feedback!");
      setView('landing');
  };

  return (
    <div className="app-container">
      {view !== 'admin-dashboard' && 
        <div style={{ width: '100%', maxWidth: '1400px', padding: '20px 0' }}>
          <Navbar onViewChange={(v) => setView(v === 'track' ? 'track-order-input' : v)} cartCount={cart.length} onOpenCart={() => setIsCartOpen(true)} onDeviceChange={setDeviceMode} />
        </div>
      }

      <div style={getDeviceStyle()} className="device-screen">
        {view === 'landing' && <LandingPage setView={setView} impactStats={impactStats} recentImpactStats={recentImpactStats} />} 

        {view === 'menu' && (
          <div className="animate-in" style={{ padding: '0 20px' }}>
            <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 25px', marginBottom: '25px', alignItems:'center' }}>
              <button onClick={() => setView('landing')} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}><ArrowLeft size={18} /> Home</button>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['All', 'Veg', 'Non-Veg'].map(t => (
                  <button key={t} onClick={() => setFilterType(t)} style={getFilterStyle(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="masonry-container">
              {menuLoadError && (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', color: '#ff6b81' }}>
                  {menuLoadError}
                </div>
              )}
              {!menuLoadError && Object.keys(getGroupedMenu()).length === 0 && (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', color: '#ccc' }}>
                  No menu items found yet.
                </div>
              )}
              {Object.entries(getGroupedMenu()).map(([cat, items]) => (
                <div key={cat} className="glass-panel masonry-item" style={{ marginBottom: '20px', padding: '20px' }}>
                  <h2 style={{ margin: '0 0 15px 0', color: 'var(--primary-glow)', textTransform: 'uppercase', borderBottom: '1px solid #444', paddingBottom: '5px', fontSize: '1.2rem' }}>{cat}</h2>
                  <div style={{ display: 'flex', flexDirection: 'column' }}> 
                     {items.map(i => <MenuItem key={i.id} item={i} onAdd={addToCart} onRemove={removeFromCart} cartCount={getItemCount(i.id)} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'track-order-input' && (
            <div className="glass-panel animate-in" style={{ maxWidth: '500px', margin: '50px auto', padding: '40px', textAlign: 'center' }}>
                <button onClick={() => setView('landing')} style={{ float: 'left', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
                <h2 style={{ marginBottom: '30px', clear:'both' }}>Track & Rate</h2>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button onClick={() => setTrackStatus(null)} className="btn-primary" style={{ flex: 1 }}>Status</button>
                    <button onClick={() => setView('rate-order')} className="glass-panel" style={{ flex: 1, cursor: 'pointer', border:'none' }}>Rate Food</button>
                </div>
                <input className="glass-input" placeholder="Enter Token" value={trackInput} onChange={e => setTrackInput(e.target.value)} style={{ marginBottom: '20px', textAlign: 'center' }} />
                <button className="btn-primary" onClick={checkStatus} style={{ width: '100%' }}>Check Status</button>
                {trackStatus && <div style={{ marginTop: '20px', color:'var(--primary-glow)' }}><h3>Status: {trackStatus.status}</h3></div>}
            </div>
        )}

        {view === 'rate-order' && (
            <div className="glass-panel animate-in" style={{ maxWidth: '500px', margin: '50px auto', padding: '40px', textAlign: 'center' }}>
                <button onClick={() => setView('track-order-input')} style={{ float: 'left', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
                <h2 style={{ marginBottom: '20px', clear:'both' }}>Rate Your Meal</h2>
                <input className="glass-input" placeholder="Enter Order Token" value={rateToken} onChange={e => setRateToken(e.target.value)} style={{ marginBottom: '20px', textAlign: 'center' }} />
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                    {[1, 2, 3, 4, 5].map(star => <Star key={star} size={32} fill={star <= userRating ? "#ffd700" : "none"} color={star <= userRating ? "#ffd700" : "#666"} style={{ cursor: 'pointer' }} onClick={() => setUserRating(star)} />)}
                </div>
                <button className="btn-primary" onClick={submitRating} style={{ width: '100%' }}>Submit Feedback</button>
            </div>
        )}

        {view === 'ai-age' && (
          <div className="glass-panel animate-in" style={{ maxWidth: '500px', margin: '50px auto', padding: '40px', textAlign: 'center' }}>
            <button onClick={() => setView('landing')} style={{ float: 'left', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
            <div style={{ clear: 'both', height: '20px' }}></div>
            <h1>Step 1: Your Age</h1>
            <div style={{ fontSize: '5rem', color: 'var(--primary-glow)', margin: '20px 0', textShadow: '0 0 10px var(--primary-glow)' }}>{ageInput}</div>
            <input type="range" min="5" max="90" value={ageInput} onChange={e => setAgeInput(e.target.value)} style={{ width: '100%', accentColor: 'var(--primary-glow)' }} />
            <button className="btn-primary" style={{ marginTop: '30px', width: '100%' }} onClick={() => setView('ai-select')}>Next Step</button>
          </div>
        )}

        {view === 'ai-select' && (
          <div style={{ textAlign: 'center', marginTop: '10vh' }} className="animate-in">
             <button onClick={() => setView('ai-age')} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}>← Back</button>
             <h1 style={{ margin: '20px 0 40px' }}>Choose Method</h1>
             <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                <div className="glass-panel hover-glow" style={{ padding: '40px', cursor: 'pointer', width: '150px' }} onClick={() => setView('ai-camera')}><h2>📷 Camera</h2></div>
                <div className="glass-panel hover-glow" style={{ padding: '40px', cursor: 'pointer', width: '150px' }} onClick={() => setView('ai-manual')}><h2>✍️ Manual</h2></div>
             </div>
          </div>
        )}

        {view === 'ai-manual' && (
          <div className="glass-panel animate-in" style={{ maxWidth: '600px', margin: '50px auto', padding: '30px' }}>
            <button onClick={() => setView('ai-select')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>← Back</button>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Customize Your Meal</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div><label style={{ color: '#ccc', fontSize: '0.9rem' }}>How are you feeling right now?</label><select className="glass-input" onChange={e => setManualForm({ ...manualForm, mood: e.target.value })}><option>Happy</option><option>Sad</option><option>Angry</option><option>Neutral</option><option>Disgust</option><option>Surprise</option><option>Fear</option></select></div>
                <div><label style={{ color: '#ccc', fontSize: '0.9rem' }}>How hungry are you at the moment?</label><select className="glass-input" onChange={e => setManualForm({ ...manualForm, hunger: e.target.value })}><option>Light</option><option>Medium</option><option>Starving</option></select></div>
                <div><label style={{ color: '#ccc', fontSize: '0.9rem' }}>What kind of food are you craving?</label><select className="glass-input" onChange={e => setManualForm({ ...manualForm, category: e.target.value })}><option>Any</option><option>Biryani</option><option>Soups</option><option>Starters</option><option>Main Course</option><option>Dessert</option><option>Appetizer</option></select></div>
                <div><label style={{ color: '#ccc', fontSize: '0.9rem' }}>How spicy do you want your meal?</label><select className="glass-input" onChange={e => setManualForm({ ...manualForm, spice: e.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Extra Spicy</option></select></div>
            </div>
            <div style={{ marginTop: '20px' }}><label style={{ color: '#ccc', fontSize: '0.9rem' }}>Do you have any dietary preference or reference?</label><select className="glass-input" onChange={e => setManualForm({ ...manualForm, type: e.target.value })}><option value="Both">No Preference</option><option value="Veg">Pure Veg</option><option value="Non-Veg">Non-Veg</option></select></div>
            <button className="btn-primary" style={{ width: '100%', marginTop: '30px' }} onClick={handleManualSubmit}>Get Recommendations</button>
          </div>
        )}

        {view === 'ai-camera' && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
             <button onClick={() => setView('ai-select')} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', marginBottom: '20px' }}>← Back</button>
             <div className="glass-panel" style={{ padding: '10px', display: 'inline-block' }}><Webcam ref={webcamRef} width={640} /></div>
             <br /><button className="btn-primary" style={{ marginTop: '20px' }} onClick={captureFace}>Analyze</button>
          </div>
        )}

        {view === 'ai-results' && aiResult && aiResult.status !== "error" ? (
  <div className="animate-in" style={{ padding: '20px' }}>
    <header style={{ textAlign: 'center', marginBottom: '30px' }}>
      <button onClick={() => setView('landing')} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}><ArrowLeft size={18} /> Home</button>
      <h1 style={{ textShadow: '0 0 15px var(--primary-glow)' }}>Curated for You</h1>
      {/* FIXED: Using optional chaining ?. to prevent crash if backend data is missing */}
      <p style={{ color: 'var(--primary-glow)' }}>
        Mood: {aiResult.detected?.mood || "Neutral"} • Weather: {aiResult.detected?.weather_desc || "Sunny"}
      </p>
    </header>

    <div className="rec-split-container">
      {getRecsByType('veg').length > 0 && (
        <div className="glass-panel rec-column" style={{ padding: '20px', borderTop: '4px solid #2ecc71' }}>
          <h2 style={{ color: '#2ecc71', marginBottom: '15px', borderBottom: '1px solid #333' }}>Veg</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {getRecsByType('veg').map(i => <MenuItem key={i.id} item={i} onAdd={addToCart} onRemove={removeFromCart} cartCount={getItemCount(i.id)} />)}
          </div>
        </div>
      )}

      {getRecsByType('non-veg').length > 0 && (
        <div className="glass-panel rec-column" style={{ padding: '20px', borderTop: '4px solid #e74c3c' }}>
          <h2 style={{ color: '#e74c3c', marginBottom: '15px', borderBottom: '1px solid #333' }}>Non-Veg</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {getRecsByType('non-veg').map(i => <MenuItem key={i.id} item={i} onAdd={addToCart} onRemove={removeFromCart} cartCount={getItemCount(i.id)} />)}
          </div>
        </div>
      )}
    </div>
  </div>
) : view === 'ai-results' && (
  <div style={{textAlign:'center', marginTop:'10vh'}}>
    <h2>Face Not Recognized</h2>
    <p>Please try again with better lighting.</p>
    <button className="btn-primary" onClick={() => setView('ai-camera')}>Back to Camera</button>
  </div>
)}

        {view === 'track' && (
          <div className="glass-panel animate-in" style={{ maxWidth: '500px', margin: '50px auto', padding: '50px', textAlign: 'center' }}>
            <QrCode size={100} style={{ margin: '0 auto 20px', color:'var(--primary-glow)' }} />
            <h1>#{token}</h1>
            <button className="btn-primary" onClick={() => setView('landing')}>Back to Home</button>
          </div>
        )}

        {view === 'admin-dashboard' && <AdminDashboard API_URL={API_URL} onLogout={() => setView('landing')} />}

        {view === 'admin-login' && (
          <div className="glass-panel animate-in" style={{ maxWidth: '350px', margin: '15vh auto', padding: '50px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            <button onClick={() => setView('landing')} style={{ alignSelf: 'flex-start', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>← Back</button>
            <h2>Kitchen Login</h2>
            <input className="glass-input" placeholder="ID" onChange={e => setAdminCreds({ ...adminCreds, id: e.target.value })} style={{ width: '100%' }} />
            <input className="glass-input" type="password" placeholder="Password" onChange={e => setAdminCreds({ ...adminCreds, password: e.target.value })} style={{ width: '100%' }} />
            <button className="btn-primary" onClick={() => adminCreds.id === 'admin1' && adminCreds.password === 'admin123' ? setView('admin-dashboard') : alert('Invalid')} style={{ width: '100%' }}>Login</button>
          </div>
        )}

        <CartDrawer
          cart={cart}
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onPlaceOrder={placeOrder}
          onRemove={(idx) => {
            const n = [...cart];
            n.splice(idx, 1);
            setCart(n);
          }}
        />
      </div> 
    </div>
  );
}
