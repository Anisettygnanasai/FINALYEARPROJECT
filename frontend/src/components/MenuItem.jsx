import React from 'react';
import { Star } from 'lucide-react';

const MenuItem = ({ item, onAdd, onRemove, cartCount }) => {
  return (
    <div className="hover-glow" style={{ 
        display:'flex', 
        justifyContent:'space-between', 
        alignItems:'center', 
        padding:'15px 0', 
        borderBottom: '1px solid rgba(255,255,255,0.1)', 
        marginBottom: '5px',
        transition: 'all 0.3s ease'
    }}>
      <div style={{flexGrow:1, paddingRight:'15px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px'}}>
           <div style={{width:'10px', height:'10px', borderRadius:'50%', background: item.type.toLowerCase()==='veg' ? '#2ecc71' : '#e74c3c'}}></div>
           <h4 style={{margin:0, fontSize:'1.1rem', color:'#fff', fontWeight:'600', display:'flex', alignItems:'center', gap:'8px'}}>
             {item.name}
             {/* RATING DISPLAY */}
             <span style={{ display:'flex', alignItems:'center', gap:'3px', fontSize:'0.85rem', color:'#ffd700', fontWeight:'400' }}>
                <Star size={14} fill="#ffd700" color="#ffd700" /> {item.rating}
             </span>
           </h4>
        </div>
        
        {/* Dimmed description/calories */}
        <div style={{fontSize:'0.85rem', color:'#777', lineHeight:'1.4', fontWeight:'300'}}>
            {item.description} <span style={{color:'#444', marginLeft:'5px'}}>• {item.calories} cal</span>
        </div>
        
        <div style={{fontSize:'1rem', color:'var(--primary-glow)', fontWeight:'bold', marginTop:'6px', textShadow:'0 0 5px rgba(0, 242, 255, 0.3)'}}>₹{item.price}</div>
      </div>

      <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
         {cartCount > 0 && (
            <>
               <button onClick={() => onRemove(item)} style={{background:'rgba(255,255,255,0.1)', color:'white', border:'none', width:'30px', height:'30px', borderRadius:'50%', cursor:'pointer'}}>-</button>
               <span style={{fontSize:'1rem', fontWeight:'bold'}}>{cartCount}</span>
            </>
         )}
         <button onClick={() => onAdd(item)} className="btn-primary" style={{width:'35px', height:'35px', padding:0, borderRadius:'50%', fontSize:'1.2rem'}}>+</button>
      </div>
    </div>
  );
};

export default MenuItem;