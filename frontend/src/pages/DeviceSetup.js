import React, { useState } from 'react';

const DeviceSetup = () => {
  const [scanning, setScanning] = useState(false);
  const [availableDevices] = useState([
    { id: 1, name: 'ESP32-Light-01', type: 'Light Controller', status: 'available', signal: 85 },
    { id: 2, name: 'ESP32-Fan-01', type: 'Fan Controller', status: 'available', signal: 92 },
    { id: 3, name: 'NodeMCU-Sensor-01', type: 'Motion Sensor', status: 'available', signal: 78 },
    { id: 4, name: 'ESP32-Band-01', type: 'Health Monitor', status: 'paired', signal: 95 }
  ]);

  const [connectedDevices] = useState([
    { id: 1, name: 'Living Room Light', type: 'ESP32', status: 'online', battery: 100 },
    { id: 2, name: 'Bedroom Fan', type: 'NodeMCU', status: 'online', battery: 87 },
    { id: 3, name: 'Smart Band', type: 'ESP32', status: 'online', battery: 65 }
  ]);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 3000);
  };

  return (
    <div className="min-h-screen relative">
      {/* Setup Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://img.freepik.com/free-psd/3d-rendering-device-background_23-2150571835.jpg)'
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
      </div>
      
      <div className="relative z-10 pt-56 p-4 md:p-6 pb-24" style={{zIndex: 10}}>
        <div className="mb-20"></div>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl" style={{marginTop: '4rem'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">⚙️</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Device Setup</h1>
                <p className="text-white/80">Pair and configure your IoT devices</p>
              </div>
            </div>
            <button 
              onClick={handleScan}
              disabled={scanning}
              className={`px-6 py-3 rounded-xl font-medium transition-all shadow-lg ${
                scanning 
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30' 
                  : 'bg-blue-500/20 text-blue-300 border border-blue-400/30 hover:bg-blue-500/30'
              }`}
            >
              {scanning ? '🔄 Scanning...' : '🔍 Scan for Devices'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <span>📡</span>
              <span>Available Devices</span>
            </h3>
            <div className="space-y-3">
              {availableDevices.map((device) => (
                <div key={device.id} className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500/30 to-purple-600/30 rounded-lg flex items-center justify-center text-2xl">
                        {device.type === 'Light Controller' ? '💡' : 
                         device.type === 'Fan Controller' ? '🌀' :
                         device.type === 'Motion Sensor' ? '👋' : '❤️'}
                      </div>
                      <div>
                        <p className="text-white font-medium">{device.name}</p>
                        <p className="text-slate-300 text-sm">{device.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-slate-300 text-sm font-medium">{device.signal}%</span>
                      </div>
                      {device.status === 'available' ? (
                        <button className="bg-green-500/20 text-green-300 px-4 py-2 rounded-lg text-sm border border-green-400/30 hover:bg-green-500/30 transition-all">
                          Pair
                        </button>
                      ) : (
                        <span className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg text-sm border border-blue-400/30">
                          Paired
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <span>✅</span>
              <span>Connected Devices</span>
            </h3>
            <div className="space-y-3">
              {connectedDevices.map((device) => (
                <div key={device.id} className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${device.status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                      <div>
                        <p className="text-white font-medium">{device.name}</p>
                        <p className="text-slate-300 text-sm">{device.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-slate-300 text-xs">Battery</p>
                        <p className={`text-sm font-medium ${
                          device.battery > 80 ? 'text-green-400' :
                          device.battery > 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>{device.battery}%</p>
                      </div>
                      <button className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm border border-red-400/30 hover:bg-red-500/30 transition-all">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>🔧</span>
            <span>Quick Setup Guide</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="text-center">
                <div className="text-3xl mb-3">1️⃣</div>
                <h4 className="text-white font-medium mb-2">Power On Device</h4>
                <p className="text-slate-300 text-sm">Connect ESP32/NodeMCU to power source</p>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="text-center">
                <div className="text-3xl mb-3">2️⃣</div>
                <h4 className="text-white font-medium mb-2">Connect Wi-Fi</h4>
                <p className="text-slate-300 text-sm">Device will create hotspot for setup</p>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="text-center">
                <div className="text-3xl mb-3">3️⃣</div>
                <h4 className="text-white font-medium mb-2">Scan & Pair</h4>
                <p className="text-slate-300 text-sm">Use scan button to find devices</p>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="text-center">
                <div className="text-3xl mb-3">4️⃣</div>
                <h4 className="text-white font-medium mb-2">Test Control</h4>
                <p className="text-slate-300 text-sm">Verify device responds to commands</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 md:p-8 shadow-2xl">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>📋</span>
            <span>Network Status</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-300">Wi-Fi Connection</span>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-white font-bold">SmartHome_Network</p>
              <p className="text-green-400 text-sm">Signal: Strong (95%)</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-300">MQTT Broker</span>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-white font-bold">Connected</p>
              <p className="text-blue-400 text-sm">broker.hivemq.com</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-300">Cloud Sync</span>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-white font-bold">Active</p>
              <p className="text-purple-400 text-sm">Last sync: 2 min ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceSetup;