import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <video 
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      >
        <source src="/LoadingPage.mov" type="video/mp4" />
        <source src="/LoadingPage.mov" type="video/quicktime" />
      </video>
    </div>
  );
};

export default LoadingScreen;