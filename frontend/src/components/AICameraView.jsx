import React, { useRef } from 'react';
import Webcam from 'react-webcam';

const AICameraView = ({ onCapture }) => {
  const webcamRef = useRef(null);

  const handleCapture = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      onCapture(imageSrc);
    }
  };

  return (
    <div className="animate-in" style={{ textAlign:'center', marginTop:'5vh' }}>
      <h2 style={{ fontSize:'2.5rem', marginBottom:'30px' }}>Let our AI Chef see you</h2>
      <div className="glass-panel" style={{ display:'inline-block', padding:'15px', marginBottom:'40px', borderRadius:'24px' }}>
        <Webcam 
          audio={false} 
          ref={webcamRef} 
          screenshotFormat="image/jpeg" 
          width={640} height={480} 
          style={{ borderRadius:'16px' }} 
        />
      </div>
      <br/>
      <button className="btn-primary" onClick={handleCapture} style={{ padding:'20px 60px', fontSize:'1.3rem' }}>
        Analyze My Mood
      </button>
    </div>
  );
};

export default AICameraView;