import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Alerts = () => {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState([
    {
      _id: '1',
      type: 'fall',
      message: 'Fall detected in living room - immediate assistance required',
      createdAt: new Date(),
      resolved: false
    },
    {
      _id: '2', 
      type: 'health',
      message: 'Heart rate elevated - monitoring required',
      createdAt: new Date(Date.now() - 3600000),
      resolved: true
    },
    {
      _id: '3',
      type: 'security',
      message: 'Unusual activity detected at main door',
      createdAt: new Date(Date.now() - 7200000),
      resolved: false
    }
  ]);

  const alertIcons = {
    fall: '🚨',
    health: '❤️',
    security: '🔒'
  };

  const alertColors = {
    fall: 'from-red-500 to-pink-600',
    health: 'from-yellow-500 to-orange-600', 
    security: 'from-blue-500 to-purple-600'
  };

  return (
    <div className="min-h-screen relative">
      {/* Alerts Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://img.freepik.com/premium-photo/attention-sign-cyberspace-attacked-by-hackers_584311-344.jpg?semt=ais_hybrid&w=740&q=80)'
        }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
      
      <div className="relative z-10 pt-56 p-4 md:p-6 pb-24" style={{zIndex: 10}}>
        <div className="mb-20"></div>
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600/20 to-rose-600/20 backdrop-blur-xl border border-white/20 rounded-3xl p-6 mb-8 shadow-2xl" style={{marginTop: '4rem'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Emergency Alerts</h1>
              <p className="text-white/80">Monitor safety and health notifications</p>
            </div>
          </div>
          <Link to="/dashboard" className="bg-white/20 border border-white/30 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all backdrop-blur-sm flex items-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm font-medium">Active Alerts</p>
              <p className="text-4xl font-bold text-white">{alerts.filter(a => !a.resolved).length}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-600 to-green-700 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm font-medium">Resolved Today</p>
              <p className="text-4xl font-bold text-white">{alerts.filter(a => a.resolved).length}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm font-medium">Response Time</p>
              <p className="text-4xl font-bold text-white">2m</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button className="glass rounded-xl p-4 text-center card-hover">
          <div className="text-3xl mb-2">📞</div>
          <p className="text-white text-sm font-medium">Call 911</p>
        </button>
        <button className="glass rounded-xl p-4 text-center card-hover">
          <div className="text-3xl mb-2">👩🏻‍⚕️</div>
          <p className="text-white text-sm font-medium">Call Caregiver</p>
        </button>
        <button className="glass rounded-xl p-4 text-center card-hover">
          <div className="text-3xl mb-2">📱</div>
          <p className="text-white text-sm font-medium">Send SOS</p>
        </button>
        <button className="glass rounded-xl p-4 text-center card-hover">
          <div className="text-3xl mb-2">🔇</div>
          <p className="text-white text-sm font-medium">Silence All</p>
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.map(alert => (
          <div key={alert._id} className="bg-white/95 backdrop-blur-xl border border-gray-300 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${alertColors[alert.type]} text-white shadow-lg`}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    {alert.type === 'fall' && <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>}
                    {alert.type === 'health' && <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>}
                    {alert.type === 'security' && <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11C15.4,11 16,11.4 16,12V16C16,16.6 15.6,17 15,17H9C8.4,17 8,16.6 8,16V12C8,11.4 8.4,11 9,11V10C9,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.2,9.2 10.2,10V11H13.8V10C13.8,9.2 12.8,8.2 12,8.2Z"/>}
                  </svg>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-800 capitalize">
                      {alert.type} Alert
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      alert.resolved 
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
                    }`}>
                      {alert.resolved ? 'Resolved' : 'Active'}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{alert.message}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                      <span>{new Date(alert.createdAt).toLocaleString()}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                      <span>Living Room</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {!alert.resolved && (
                  <button className="bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded-xl hover:bg-green-200 transition-all font-medium">
                    Resolve
                  </button>
                )}
                <button className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-all font-medium">
                  Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Health Monitoring */}
      <div className="glass rounded-2xl p-6 mt-8">
        <h3 className="text-xl font-bold text-white mb-4">Health Monitoring</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Heart Rate</p>
                <p className="text-2xl font-bold text-white">72 BPM</p>
              </div>
              <div className="text-2xl">❤️</div>
            </div>
          </div>
          
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Activity Level</p>
                <p className="text-2xl font-bold text-white">Normal</p>
              </div>
              <div className="text-2xl">🚶</div>
            </div>
          </div>
          
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Sleep Quality</p>
                <p className="text-2xl font-bold text-white">Good</p>
              </div>
              <div className="text-2xl">😴</div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Alerts;