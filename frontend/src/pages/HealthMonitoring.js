import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const HealthMonitoring = () => {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthData();
    fetchAnalytics();
  }, []);

  const fetchHealthData = async () => {
    try {
      const response = await api.get('/health');
      setHealthData(response.data);
    } catch (error) {
      console.error('Error fetching health data:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/health/analytics');
      setAnalytics(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Health Monitoring</h1>
              <p className="text-gray-600">Track your health metrics and wellness data</p>
            </div>
            <div className="text-4xl">❤️</div>
          </div>
        </div>

        {/* Health Stats Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl">💓</div>
                <div className="text-sm text-gray-500">Average</div>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                {analytics.averageHeartRate} BPM
              </div>
              <p className="text-gray-600 text-sm">Heart Rate</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl">👟</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analytics.totalSteps.toLocaleString()}
              </div>
              <p className="text-gray-600 text-sm">Steps</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl">🚨</div>
                <div className="text-sm text-gray-500">Incidents</div>
              </div>
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {analytics.fallCount}
              </div>
              <p className="text-gray-600 text-sm">Falls Detected</p>
            </div>
          </div>
        )}

        {/* Recent Health Data */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Health Data</h2>
          
          {healthData.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📱</div>
              <p className="text-gray-600 text-lg">No health data available</p>
              <p className="text-gray-500">Make sure your health band is connected</p>
            </div>
          ) : (
            <div className="space-y-4">
              {healthData.slice(0, 10).map((data, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      {data.fallDetected ? '🚨' : data.emergencyTriggered ? '🆘' : '💓'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {data.fallDetected ? 'Fall Detected!' : 
                         data.emergencyTriggered ? 'Emergency Alert' : 
                         'Health Check'}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {new Date(data.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {data.heartRate && (
                      <p className="text-lg font-semibold text-red-600">
                        {data.heartRate} BPM
                      </p>
                    )}
                    {data.steps && (
                      <p className="text-sm text-gray-600">
                        {data.steps} steps
                      </p>
                    )}
                    {data.batteryLevel && (
                      <p className="text-xs text-gray-500">
                        Battery: {data.batteryLevel}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Actions */}
        <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">Emergency Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => {
                // Simulate fall detection
                api.post('/health/fall-detected', {
                  deviceId: 'health_band_01',
                  userId: user.id,
                  location: 'Living Room'
                });
                alert('Fall detection test sent!');
              }}
              className="bg-white/20 hover:bg-white/30 rounded-xl p-4 text-left transition-all"
            >
              <div className="text-2xl mb-2">🚨</div>
              <h3 className="font-semibold mb-1">Test Fall Detection</h3>
              <p className="text-sm opacity-90">Simulate a fall detection alert</p>
            </button>
            
            <button 
              onClick={() => {
                // Manual emergency
                alert('Emergency alert sent to caregivers!');
              }}
              className="bg-white/20 hover:bg-white/30 rounded-xl p-4 text-left transition-all"
            >
              <div className="text-2xl mb-2">🆘</div>
              <h3 className="font-semibold mb-1">Manual Emergency</h3>
              <p className="text-sm opacity-90">Send immediate help request</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthMonitoring;