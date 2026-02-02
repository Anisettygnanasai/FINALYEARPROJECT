import React from 'react';
import { ChefHat, ShoppingCart, Activity, Lock, Monitor, Tablet, Smartphone } from 'lucide-react';

const Navbar = ({ onViewChange, cartCount, onOpenCart, onDeviceChange }) => (
  <nav className="glass-panel" style={{ 
      display:'flex', justifyContent:'space-between', alignItems:'center', 
      padding:'15px 30px', marginBottom:'20px', borderRadius:'16px'
    }}>
    
    {/* LOGO */}
    <div style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }} onClick={() => onViewChange('landing')}>
      <ChefHat size={28} color="var(--primary-glow)" />
      <h2 style={{ margin:0, fontSize:'1.4rem', color:'#fff', letterSpacing:'1px' }}>SMART DINE</h2>
    </div>

    {/* DEVICE SWITCHER (Requirement met) */}
    <div className="glass-panel" style={{ display:'flex', gap:'10px', padding:'5px 15px', borderRadius:'30px', border:'1px solid #444' }}>
      <Monitor size={20} style={{ cursor:'pointer', color:'#aaa' }} onClick={() => onDeviceChange('kiosk')} title="Kiosk View"/>
      <Tablet size={20} style={{ cursor:'pointer', color:'#aaa' }} onClick={() => onDeviceChange('tablet')} title="Tablet View"/>
      <Smartphone size={20} style={{ cursor:'pointer', color:'#aaa' }} onClick={() => onDeviceChange('phone')} title="Phone View"/>
    </div>
    
    {/* ACTIONS */}
    <div style={{ display:'flex', gap:'20px', alignItems:'center' }}>
      <button onClick={() => onViewChange('admin-login')} style={{ background:'none', border:'none', color:'#666', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', fontSize:'0.8rem' }}>
        <Lock size={14} /> Kitchen
      </button>

      <button className="btn-primary" style={{ background:'transparent', padding:'6px 15px', fontSize:'0.8rem' }} onClick={() => onViewChange('track')}>
        <Activity size={16} style={{ marginRight:'6px' }}/> Track Order
      </button>
      
      <div style={{ position:'relative', cursor:'pointer' }} onClick={onOpenCart}>
        <ShoppingCart size={24} color="#fff"/>
        {cartCount > 0 && <span style={{ position:'absolute', top:'-8px', right:'-8px', background:'#ff4757', borderRadius:'50%', width:'18px', height:'18px', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:'bold' }}>{cartCount}</span>}
      </div>
    </div>
  </nav>
);

export default Navbar;