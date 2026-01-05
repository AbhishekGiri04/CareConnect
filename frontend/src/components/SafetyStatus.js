import React from 'react';

const SafetyStatus = () => {
  return (
    <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 mb-8 shadow-2xl">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
        <span>🛡️</span>
        <span>Safety Status</span>
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="text-2xl mb-1">⛽</div>
          <p className="text-white text-sm font-medium">Gas Leak:</p>
          <p className="text-green-400 font-bold">SAFE</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="text-2xl mb-1">🔒</div>
          <p className="text-white text-sm font-medium">Security:</p>
          <p className="text-red-400 font-bold">INACTIVE</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="text-2xl mb-1">🌡️</div>
          <p className="text-white text-sm font-medium">Temperature:</p>
          <p className="text-green-400 font-bold">NORMAL</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="text-2xl mb-1">👁️</div>
          <p className="text-white text-sm font-medium">Motion:</p>
          <p className="text-green-400 font-bold">DETECTED</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3 text-center">
          <div className="text-2xl mb-1">🚪</div>
          <p className="text-white text-sm font-medium">Door Status:</p>
          <p className="text-green-400 font-bold">LOCKED</p>
        </div>
      </div>
    </div>
  );
};

export default SafetyStatus;