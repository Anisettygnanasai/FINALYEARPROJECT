import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Star } from 'lucide-react';

const AdminDashboard = ({ API_URL, onLogout }) => {
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  
  // FULL ATTRIBUTES STATE
  const [newItem, setNewItem] = useState({
    name: '', price: '', category: 'Starters', type: 'veg', 
    calories: '200', description: '', 
    mood_tag: 'Happy', weather_tag: 'Sunny', age_group: 'All'
  });

  useEffect(() => {
    fetchOrders();
    fetchMenu();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = () => { fetch(`${API_URL}/admin/orders`).then(res => res.json()).then(setOrders).catch(console.error); };
  const fetchMenu = () => { fetch(`${API_URL}/menu`).then(res => res.json()).then(setMenuItems); };
  
  const updateStatus = async (token, status) => { 
    await fetch(`${API_URL}/admin/update`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ token, status }) }); 
    fetchOrders(); 
  };
  
  const handleAddItem = async () => { 
    if(!newItem.name) return alert("Name required");
    await fetch(`${API_URL}/admin/menu/add`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(newItem) }); 
    alert("Item Added!"); 
    fetchMenu(); 
  };
  
  const handleDeleteItem = async (name) => { 
    if(confirm(`Delete ${name}?`)) { 
        await fetch(`${API_URL}/admin/menu/delete`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name }) }); 
        fetchMenu(); 
    }
  };

  return (
    <div className="animate-in" style={{maxWidth:'1200px', margin:'0 auto'}}>
      <header className="glass-panel" style={{ display:'flex', justifyContent:'space-between', padding:'20px', marginBottom:'30px' }}>
        <h2 style={{ margin:0, color:'var(--primary-glow)' }}>KITCHEN DASHBOARD</h2>
        <button className="btn-primary" onClick={onLogout} style={{background:'transparent', border:'1px solid #ff4757', color:'#ff4757'}}>Logout</button>
      </header>

      <div style={{ display:'flex', gap:'20px', marginBottom:'30px' }}>
        <button className={tab === 'orders' ? 'btn-primary' : 'glass-panel'} style={{ padding:'12px 30px', cursor:'pointer' }} onClick={() => setTab('orders')}>Live Orders</button>
        <button className={tab === 'menu' ? 'btn-primary' : 'glass-panel'} style={{ padding:'12px 30px', cursor:'pointer' }} onClick={() => setTab('menu')}>Manage Menu</button>
      </div>

      {tab === 'orders' ? (
        <div className="glass-panel" style={{ padding:'30px', minHeight:'50vh' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}><h3>Active Orders</h3><button onClick={fetchOrders} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer' }}><RefreshCw size={20}/></button></div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px' }}>
            {Object.values(orders).map((order) => (
              <div key={order.token} style={{ background:'rgba(255,255,255,0.05)', padding:'20px', borderRadius:'16px', borderLeft:`4px solid ${order.status === 'Accepted' ? '#ff9f43' : '#00d2d3'}` }}>
                <h3>#{order.token}</h3><div style={{ marginBottom:'15px', color:'#ccc' }}>{order.items.map((i, idx) => <div key={idx}>1x {i.name}</div>)}</div>
                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={() => updateStatus(order.token, 'Preparing')} style={{ flex:1, padding:'8px', background:'#333', border:'none', color:'white' }}>Prep</button>
                  <button onClick={() => updateStatus(order.token, 'Ready')} style={{ flex:1, padding:'8px', background:'#2e86de', border:'none', color:'white' }}>Ready</button>
                  <button onClick={() => updateStatus(order.token, 'Served')} style={{ flex:1, padding:'8px', background:'#10ac84', border:'none', color:'white' }}>Done</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'30px' }}>
          {/* ADD ITEM FORM - RESTORED FULL INPUTS */}
          <div className="glass-panel" style={{ padding:'30px', height:'fit-content' }}>
            <h3>Add New Item</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'15px' }}>
                <input placeholder="Item Name" className="glass-input" onChange={e=>setNewItem({...newItem, name:e.target.value})} />
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                    <input placeholder="Price (₹)" className="glass-input" onChange={e=>setNewItem({...newItem, price:e.target.value})} />
                    <input placeholder="Calories" className="glass-input" onChange={e=>setNewItem({...newItem, calories:e.target.value})} />
                </div>
                <select className="glass-input" onChange={e=>setNewItem({...newItem, category:e.target.value})}><option>Starters</option><option>Soups</option><option>Main Course</option><option>Biryani</option></select>
                
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                    <select className="glass-input" onChange={e=>setNewItem({...newItem, type:e.target.value})}><option value="veg">Veg</option><option value="non-veg">Non-Veg</option></select>
                    <select className="glass-input" onChange={e=>setNewItem({...newItem, age_group:e.target.value})}><option>All</option><option>Child</option><option>Adult</option><option>Senior</option></select>
                </div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                    <select className="glass-input" onChange={e=>setNewItem({...newItem, mood_tag:e.target.value})}><option>Happy</option><option>Sad</option><option>Angry</option></select>
                    <select className="glass-input" onChange={e=>setNewItem({...newItem, weather_tag:e.target.value})}><option>Sunny</option><option>Rainy</option><option>Cold</option></select>
                </div>
                <button className="btn-primary" onClick={handleAddItem}><Plus size={18}/> Add Item</button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding:'30px' }}>
            <h3>Current Menu ({menuItems.length})</h3>
            <div style={{ maxHeight:'60vh', overflowY:'auto' }}>
              {menuItems.map((item, idx) => (
                <div key={idx} style={{ display:'flex', justifyContent:'space-between', padding:'12px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontWeight:'bold' }}>{item.name}</div>
                    <div style={{ fontSize:'0.8rem', color:'#888' }}>
                        {item.category} • ₹{item.price} • {item.rating}★
                    </div>
                  </div>
                  <button onClick={() => handleDeleteItem(item.name)} style={{ color:'#ff4757', background:'none', border:'none', cursor:'pointer' }}><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;