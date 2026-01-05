import React, { useState } from 'react';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('week');
  
  const stats = {
    deviceUsage: [
      { device: 'Living Room Light', usage: 85, hours: '6.8h' },
      { device: 'Bedroom Fan', usage: 72, hours: '5.2h' },
      { device: 'Kitchen Light', usage: 45, hours: '3.1h' },
      { device: 'Smart Band', usage: 95, hours: '22.8h' }
    ],
    energyData: {
      today: 12.5,
      week: 87.3,
      month: 342.1,
      savings: 23
    },
    healthMetrics: {
      steps: 3247,
      heartRate: 72,
      sleep: 7.2,
      activity: 85
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Analytics Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://cdn.shopify.com/s/files/1/0817/7988/4088/articles/ShopifyPlus_Blog_Google_Analytics_Ecommerce_Tracking_3840x2160_914661ec-043c-4ce9-b70c-671d65803309.jpg?v=1725047341)'
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
                <span className="text-3xl">📊</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Analytics Dashboard</h1>
                <p className="text-white/80">Monitor usage patterns and optimize your smart home</p>
              </div>
            </div>
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-white backdrop-blur-sm"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {/* Energy Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">⚡</span>
              </div>
              <span className="text-green-200 text-sm font-medium">+5%</span>
            </div>
            <p className="text-white/90 text-sm font-medium">Today's Usage</p>
            <p className="text-white font-bold text-3xl">{stats.energyData.today} kWh</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-600 to-cyan-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">📅</span>
              </div>
              <span className="text-blue-200 text-sm font-medium">-12%</span>
            </div>
            <p className="text-white/90 text-sm font-medium">This Week</p>
            <p className="text-white font-bold text-3xl">{stats.energyData.week} kWh</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-600 to-pink-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">📈</span>
              </div>
              <span className="text-purple-200 text-sm font-medium">-8%</span>
            </div>
            <p className="text-white/90 text-sm font-medium">This Month</p>
            <p className="text-white font-bold text-3xl">{stats.energyData.month} kWh</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-600 to-orange-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">💰</span>
              </div>
              <span className="text-yellow-200 text-sm font-medium">↑{stats.energyData.savings}%</span>
            </div>
            <p className="text-white/90 text-sm font-medium">Savings</p>
            <p className="text-white font-bold text-3xl">${(stats.energyData.month * 0.12 * stats.energyData.savings / 100).toFixed(0)}</p>
          </div>
        </div>

        {/* Device Usage Chart */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>📱</span>
            <span>Device Usage Patterns</span>
          </h3>
          <div className="space-y-4">
            {stats.deviceUsage.map((device, index) => (
              <div key={index} className="bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500/30 to-purple-600/30 rounded-lg flex items-center justify-center text-2xl">
                      {device.device.includes('Light') ? '💡' : 
                       device.device.includes('Fan') ? '🌀' : 
                       device.device.includes('Band') ? '⌚' : '🏠'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{device.device}</p>
                      <p className="text-slate-300 text-sm">Active: {device.hours}</p>
                    </div>
                  </div>
                  <span className="text-white font-bold text-lg">{device.usage}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-1000 ${
                      device.usage > 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                      device.usage > 60 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                      device.usage > 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                      'bg-gradient-to-r from-red-500 to-pink-500'
                    }`}
                    style={{ width: `${device.usage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Health Analytics */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>❤️</span>
            <span>Health & Activity</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-xl p-4 border border-white/20 text-center">
              <div className="text-4xl mb-3">🚶</div>
              <p className="text-slate-300 text-sm">Steps Today</p>
              <p className="text-white font-bold text-2xl">{stats.healthMetrics.steps.toLocaleString()}</p>
              <div className="w-full bg-white/10 rounded-full h-2 mt-3">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 border border-white/20 text-center">
              <div className="text-4xl mb-3">❤️</div>
              <p className="text-slate-300 text-sm">Heart Rate</p>
              <p className="text-white font-bold text-2xl">{stats.healthMetrics.heartRate} BPM</p>
              <div className="w-full bg-white/10 rounded-full h-2 mt-3">
                <div className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full" style={{ width: '72%' }}></div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 border border-white/20 text-center">
              <div className="text-4xl mb-3">💤</div>
              <p className="text-slate-300 text-sm">Sleep Quality</p>
              <p className="text-white font-bold text-2xl">{stats.healthMetrics.sleep}h</p>
              <div className="w-full bg-white/10 rounded-full h-2 mt-3">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: '90%' }}></div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 border border-white/20 text-center">
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-slate-300 text-sm">Activity Score</p>
              <p className="text-white font-bold text-2xl">{stats.healthMetrics.activity}%</p>
              <div className="w-full bg-white/10 rounded-full h-2 mt-3">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Timeline */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 md:p-8 shadow-2xl">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>⏰</span>
            <span>Daily Timeline</span>
          </h3>
          <div className="space-y-3">
            {[
              { time: '06:00', activity: 'Morning routine started', device: 'Bedroom Light', type: 'device' },
              { time: '07:30', activity: 'Kitchen activity detected', device: 'Motion Sensor', type: 'sensor' },
              { time: '09:15', activity: 'Voice command: "Turn on fan"', device: 'Living Room Fan', type: 'voice' },
              { time: '12:00', activity: 'Lunch break - low activity', device: 'Smart Band', type: 'health' },
              { time: '18:30', activity: 'Evening lights activated', device: 'All Lights', type: 'automation' },
              { time: '22:00', activity: 'Sleep mode enabled', device: 'All Devices', type: 'automation' }
            ].map((event, index) => (
              <div key={index} className="bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                      event.type === 'device' ? 'bg-blue-500/20 border border-blue-400/30' :
                      event.type === 'sensor' ? 'bg-green-500/20 border border-green-400/30' :
                      event.type === 'voice' ? 'bg-purple-500/20 border border-purple-400/30' :
                      event.type === 'health' ? 'bg-red-500/20 border border-red-400/30' : 'bg-yellow-500/20 border border-yellow-400/30'
                    }`}>
                      {event.type === 'device' ? '💡' :
                       event.type === 'sensor' ? '👋' :
                       event.type === 'voice' ? '🎤' :
                       event.type === 'health' ? '❤️' : '🤖'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{event.activity}</p>
                      <p className="text-slate-300 text-sm">{event.device}</p>
                    </div>
                  </div>
                  <span className="text-slate-300 font-medium">{event.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;