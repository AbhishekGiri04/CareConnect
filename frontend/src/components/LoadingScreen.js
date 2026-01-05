import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <img 
        src="https://cdn.dribbble.com/userupload/42244572/file/original-685594fd5093f9a93e5fb79c5ee2c156.gif"
        alt="Loading..."
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default LoadingScreen;