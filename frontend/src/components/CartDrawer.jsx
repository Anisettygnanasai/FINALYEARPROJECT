import React from 'react';
import { X } from 'lucide-react';

const CartDrawer = ({ cart, isOpen, onClose, onPlaceOrder, onRemove }) => {
  const [table, setTable] = React.useState('');
  if (!isOpen) return null;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'flex-end' }}>
      <div className="glass-panel" style={{ width:'450px', borderRadius:'24px 0 0 24px', padding:'35px', display:'flex', flexDirection:'column', background:'rgba(15,15,20,0.95)', height:'100vh', boxSizing:'border-box' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'30px', borderBottom:'1px solid #333', paddingBottom:'20px' }}>
          <h2 style={{ margin:0, color:'#fff' }}>Your Tray</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'white', cursor:'pointer' }}><X size={24}/></button>
        </div>
        
        <div style={{ flexGrow:1, overflowY:'auto' }}>
          {cart.length === 0 ? <p style={{color:'#666', textAlign:'center', marginTop:'50px'}}>Your tray is empty.</p> :
            cart.map((item, idx) => (
              <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <b style={{color:'#fff', fontSize:'1.1rem'}}>{item.name}</b>
                  <br/><span style={{ color:'#888' }}>₹{item.price}</span>
                </div>
                <button onClick={() => onRemove(idx)} style={{ color:'#ff4757', background:'none', border:'1px solid #ff4757', borderRadius:'50px', padding:'5px 12px', cursor:'pointer', fontSize:'0.8rem' }}>Remove</button>
              </div>
            ))
          }
        </div>

        <div style={{ marginTop:'20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'1.4rem', marginBottom:'25px', fontWeight:'bold' }}>
            <span style={{color:'#fff'}}>Total</span><span style={{ color:'var(--primary-glow)' }}>₹{cart.reduce((s,i)=>s+parseInt(i.price),0)}</span>
          </div>
          <input type="number" placeholder="Enter Table Number" value={table} onChange={(e)=>setTable(e.target.value)} 
            style={{ width:'100%', padding:'15px', borderRadius:'12px', background:'rgba(255,255,255,0.05)', border:'1px solid #444', color:'white', marginBottom:'15px', fontSize:'1rem', boxSizing:'border-box' }} />
          <button className="btn-primary" style={{ width:'100%', padding:'15px', fontSize:'1.1rem' }} onClick={() => onPlaceOrder(table)}>Confirm & Place Order</button>
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;