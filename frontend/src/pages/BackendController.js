import React, { useState, useEffect } from 'react';
import { dashboardAPI, deviceAPI } from '../services/api';

const BackendController = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ devices: 0, onlineDevices: 0, alerts: 0 });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Get dashboard stats
      const statsResponse = await dashboardAPI.getStats();
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      // Get devices
      const devicesResponse = await dashboardAPI.getDevices();
      if (devicesResponse.data.success) {
        setDevices(devicesResponse.data.data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const controlDevice = async (deviceId, action) => {
    try {
      const response = await deviceAPI.control(deviceId, { 
        action: action,
        device_type: 'light'
      });
      
      if (response.data.success) {
        // Update local state
        setDevices(prev => prev.map(device => 
          device._id === deviceId 
            ? { ...device, status: action === 'on' }
            : device
        ));
        console.log(`Device ${action} command sent successfully`);
      }
    } catch (error) {
      console.error('Error controlling device:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading SmartAssist Backend...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5HQFTcY8v4WoS2ojp1B4EywUdG3f5Jnkh9Q&s)'
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
      </div>
      
      <div className="relative z-10 pt-56 p-4 md:p-6 pb-24" style={{zIndex: 10}}>
        <div className="mb-20"></div>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl" style={{marginTop: '4rem'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/></svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">SmartAssist Backend Controller</h1>
                <p className="text-white/80">Real-time device management connected to SmartAssist IoT system</p>
              </div>
            </div>
            <div className="bg-green-500/20 border border-green-400/40 px-4 py-2 rounded-xl">
              <span className="text-green-300 font-semibold">🟢 Connected</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm font-medium">Total Devices</p>
                <p className="text-4xl font-bold text-white">{stats.devices}</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/></svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-green-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm font-medium">Online Devices</p>
                <p className="text-4xl font-bold text-white">{stats.onlineDevices}</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9l-5.91.74L12 16l-4.09-6.26L2 9l6.91-.74L12 2z"/></svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm font-medium">Active Alerts</p>
                <p className="text-4xl font-bold text-white">{stats.alerts}</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Device Control Grid */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>🎮</span>
            <span>Device Control Panel</span>
          </h2>
          
          {devices.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/></svg>
              </div>
              <p className="text-slate-300 text-lg">No devices found</p>
              <p className="text-slate-400 text-sm">Make sure SmartAssist backend is running on port 5004</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device) => (
                <div key={device._id} className="bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${device.status ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                      <div>
                        <h3 className="text-white font-semibold">{device.name}</h3>
                        <p className="text-slate-400 text-sm capitalize">{device.type}</p>
                      </div>
                    </div>
                    <div className="text-slate-300 text-sm font-medium">{device.location}</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        device.status 
                          ? 'bg-green-500/20 text-green-300 border border-green-400/40' 
                          : 'bg-red-500/20 text-red-300 border border-red-400/40'
                      }`}>
                        {device.status ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => controlDevice(device._id, 'on')}
                        disabled={device.status}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          device.status
                            ? 'bg-green-500/30 text-green-300 border border-green-400/40 cursor-not-allowed'
                            : 'bg-green-500/20 text-green-300 border border-green-400/40 hover:bg-green-500/30'
                        }`}
                      >
                        ON
                      </button>
                      <button
                        onClick={() => controlDevice(device._id, 'off')}
                        disabled={!device.status}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          !device.status
                            ? 'bg-red-500/30 text-red-300 border border-red-400/40 cursor-not-allowed'
                            : 'bg-red-500/20 text-red-300 border border-red-400/40 hover:bg-red-500/30'
                        }`}
                      >
                        OFF
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">Connected to SmartAssist Backend (localhost:5004)</span>
            </div>
            <div className="text-slate-300 text-sm">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackendController;