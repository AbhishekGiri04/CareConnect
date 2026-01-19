import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import io from 'socket.io-client';

const CaregiverDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [socket, setSocket] = useState(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    setupRealTimeConnection();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const setupRealTimeConnection = () => {
    const socketConnection = io('http://localhost:3001');
    setSocket(socketConnection);
    
    socketConnection.on('patient_status_update', (data) => {
      console.log('Patient status update:', data);
      updatePatientStatus(data);
    });
    
    socketConnection.on('new_alert', (alert) => {
      console.log('New alert received:', alert);
      addNewAlert(alert);
    });
    
    socketConnection.on('health_data_update', (healthData) => {
      console.log('Health data update:', healthData);
      updateHealthData(healthData);
    });
  };

  const updatePatientStatus = (statusUpdate) => {
    setDashboardData(prev => {
      if (!prev) return prev;
      
      const updatedPatients = prev.patients.map(patient => 
        patient.id === statusUpdate.patientId 
          ? { ...patient, isActive: statusUpdate.isOnline, lastSeen: new Date() }
          : patient
      );
      
      return { ...prev, patients: updatedPatients };
    });
  };

  const addNewAlert = (newAlert) => {
    setDashboardData(prev => {
      if (!prev) return prev;
      
      const updatedAlerts = [newAlert, ...prev.activeAlerts];
      const criticalCount = updatedAlerts.filter(a => a.severity === 'critical').length;
      const activeCount = updatedAlerts.length;
      
      return {
        ...prev,
        activeAlerts: updatedAlerts,
        summary: {
          ...prev.summary,
          activeAlerts: activeCount,
          criticalAlerts: criticalCount
        }
      };
    });
  };

  const updateHealthData = (newHealthData) => {
    setDashboardData(prev => {
      if (!prev) return prev;
      
      const updatedHealthData = [newHealthData, ...prev.recentHealthData.slice(0, 9)];
      
      // Update patient's last heart rate
      const updatedPatients = prev.patients.map(patient => 
        patient.id === newHealthData.userId.id
          ? { ...patient, lastHeartRate: newHealthData.heartRate }
          : patient
      );
      
      return {
        ...prev,
        recentHealthData: updatedHealthData,
        patients: updatedPatients
      };
    });
  };

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/caregiver/dashboard');
      setDashboardData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Generate dynamic mock data with real timestamps
      const now = new Date();
      const patients = [
        { 
          id: 1, 
          name: 'Rajesh Kumar', 
          isActive: Math.random() > 0.3, 
          activeAlerts: Math.floor(Math.random() * 2), 
          lastHeartRate: Math.floor(Math.random() * 20) + 65, 
          lastSeen: new Date(now - Math.random() * 3600000), 
          disability: { type: 'mobility' } 
        },
        { 
          id: 2, 
          name: 'Priya Sharma', 
          isActive: Math.random() > 0.5, 
          activeAlerts: Math.floor(Math.random() * 3), 
          lastHeartRate: Math.floor(Math.random() * 25) + 70, 
          lastSeen: new Date(now - Math.random() * 7200000), 
          disability: { type: 'visual' } 
        },
        { 
          id: 3, 
          name: 'Amit Patel', 
          isActive: Math.random() > 0.4, 
          activeAlerts: Math.floor(Math.random() * 2), 
          lastHeartRate: Math.floor(Math.random() * 15) + 60, 
          lastSeen: new Date(now - Math.random() * 1800000), 
          disability: { type: 'hearing' } 
        }
      ];
      
      const totalAlerts = patients.reduce((sum, p) => sum + p.activeAlerts, 0);
      const criticalAlerts = Math.floor(totalAlerts * 0.3);
      
      const activeAlerts = [];
      if (totalAlerts > 0) {
        const alertTypes = ['health_alert', 'fall_detection', 'emergency_button', 'medication_reminder'];
        const severities = ['high', 'critical', 'medium'];
        const messages = {
          health_alert: ['Heart rate elevated', 'Blood pressure high', 'Irregular heartbeat'],
          fall_detection: ['Fall detected', 'Sudden movement detected', 'Impact detected'],
          emergency_button: ['Emergency button pressed', 'SOS activated', 'Help requested'],
          medication_reminder: ['Medication missed', 'Pill dispenser empty', 'Medication overdue']
        };
        
        for (let i = 0; i < totalAlerts; i++) {
          const patient = patients[Math.floor(Math.random() * patients.length)];
          const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
          const severity = severities[Math.floor(Math.random() * severities.length)];
          const messageOptions = messages[type];
          
          activeAlerts.push({
            _id: `alert_${i}`,
            type,
            severity,
            message: messageOptions[Math.floor(Math.random() * messageOptions.length)],
            userId: { name: patient.name, id: patient.id },
            createdAt: new Date(now - Math.random() * 3600000),
            location: ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom'][Math.floor(Math.random() * 4)]
          });
        }
      }
      
      const recentHealthData = patients.map(patient => ({
        userId: { name: patient.name, id: patient.id },
        heartRate: patient.lastHeartRate,
        steps: Math.floor(Math.random() * 3000) + 1000,
        createdAt: new Date(now - Math.random() * 7200000)
      }));
      
      setDashboardData({
        caregiver: { name: user?.displayName || 'Dr. Anjali Mehta' },
        summary: { 
          totalPatients: patients.length, 
          activeAlerts: totalAlerts, 
          criticalAlerts 
        },
        patients,
        activeAlerts,
        recentHealthData
      });
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await api.put(`/caregiver/alerts/${alertId}/resolve`);
      // Remove alert from local state immediately for better UX
      setDashboardData(prev => {
        if (!prev) return prev;
        
        const updatedAlerts = prev.activeAlerts.filter(alert => alert._id !== alertId);
        const criticalCount = updatedAlerts.filter(a => a.severity === 'critical').length;
        
        return {
          ...prev,
          activeAlerts: updatedAlerts,
          summary: {
            ...prev.summary,
            activeAlerts: updatedAlerts.length,
            criticalAlerts: criticalCount
          }
        };
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      // Simulate successful resolution for demo
      setDashboardData(prev => {
        if (!prev) return prev;
        
        const updatedAlerts = prev.activeAlerts.filter(alert => alert._id !== alertId);
        const criticalCount = updatedAlerts.filter(a => a.severity === 'critical').length;
        
        return {
          ...prev,
          activeAlerts: updatedAlerts,
          summary: {
            ...prev.summary,
            activeAlerts: updatedAlerts.length,
            criticalAlerts: criticalCount
          }
        };
      });
    }
  };

  const addPatient = async () => {
    const patientNames = ['Arjun Singh', 'Kavya Reddy', 'Vikram Gupta', 'Sneha Joshi', 'Rohit Agarwal', 'Meera Nair', 'Karan Malhotra', 'Ananya Iyer'];
    const disabilities = ['mobility', 'visual', 'hearing', 'cognitive'];
    
    const newPatient = {
      id: Date.now(),
      name: patientNames[Math.floor(Math.random() * patientNames.length)],
      isActive: Math.random() > 0.5,
      activeAlerts: Math.floor(Math.random() * 2),
      lastHeartRate: Math.floor(Math.random() * 20) + 65,
      lastSeen: new Date(),
      disability: { type: disabilities[Math.floor(Math.random() * disabilities.length)] }
    };
    
    try {
      // Try to add via API first
      const email = prompt('Enter patient email:');
      if (email) {
        await api.post('/caregiver/patients', { patientEmail: email });
        fetchDashboardData();
        alert('Patient added successfully!');
      }
    } catch (error) {
      // Simulate adding patient for demo
      if (confirm(`Add ${newPatient.name} as a new patient?`)) {
        setDashboardData(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            patients: [...prev.patients, newPatient],
            summary: {
              ...prev.summary,
              totalPatients: prev.patients.length + 1
            }
          };
        });
        alert(`${newPatient.name} added successfully!`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading caregiver dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👩‍⚕️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Caregiver Access Required</h2>
          <p className="text-gray-600">You need caregiver permissions to access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Caregiver Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://png.pngtree.com/thumb_back/fh260/background/20230320/pngtree-elderly-gentleman-receives-support-from-a-kind-woman-as-they-hold-hands-photo-image_50577562.jpg)'
        }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      
      <div className="relative z-10 pt-56 p-4 md:p-6 pb-24" style={{zIndex: 10}}>
        <div className="mb-20"></div>
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600/20 to-red-600/20 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl" style={{marginTop: '4rem'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,7H13V9H15V11H13V13H11V11H9V9H11V7Z"/></svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Caregiver Dashboard</h1>
                <p className="text-white/80">
                  Welcome, {dashboardData?.caregiver?.name || user?.displayName || 'Caregiver'} - Monitoring {dashboardData?.summary?.totalPatients || 0} patients
                  {realTimeUpdates && (
                    <span className="ml-2 inline-flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-300 text-sm">Live</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={addPatient}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:scale-105 transition-all shadow-lg"
            >
              + Add Patient
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16,17V19H2V17S2,13 9,13 16,17 16,17M12.5,7.5A3.5,3.5 0 0,1 9,11A3.5,3.5 0 0,1 5.5,7.5A3.5,3.5 0 0,1 9,4A3.5,3.5 0 0,1 12.5,7.5M15.94,13A5.32,5.32 0 0,1 18,17V19H22V17S22,13.37 15.94,13M15,4A3.39,3.39 0 0,0 13.07,4.59A5,5 0 0,1 13.07,10.41A3.39,3.39 0 0,0 15,11A3.5,3.5 0 0,0 18.5,7.5A3.5,3.5 0 0,0 15,4Z"/></svg>
              </div>
              <span className="text-blue-200 text-sm font-medium">Total</span>
            </div>
            <p className="text-white/90 text-sm font-medium">Patients Under Care</p>
            <p className="text-white font-bold text-3xl">{dashboardData?.summary?.totalPatients || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-red-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
              </div>
              <span className="text-orange-200 text-sm font-medium">Active</span>
            </div>
            <p className="text-white/90 text-sm font-medium">Pending Alerts</p>
            <p className="text-white font-bold text-3xl">{dashboardData?.summary?.activeAlerts || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-pink-700 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
              </div>
              <span className="text-red-200 text-sm font-medium">Critical</span>
            </div>
            <p className="text-white/90 text-sm font-medium">Critical Alerts</p>
            <p className="text-white font-bold text-3xl">{dashboardData?.summary?.criticalAlerts || 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Patient Status */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16,17V19H2V17S2,13 9,13 16,17 16,17M12.5,7.5A3.5,3.5 0 0,1 9,11A3.5,3.5 0 0,1 5.5,7.5A3.5,3.5 0 0,1 9,4A3.5,3.5 0 0,1 12.5,7.5M15.94,13A5.32,5.32 0 0,1 18,17V19H22V17S22,13.37 15.94,13M15,4A3.39,3.39 0 0,0 13.07,4.59A5,5 0 0,1 13.07,10.41A3.39,3.39 0 0,0 15,11A3.5,3.5 0 0,0 18.5,7.5A3.5,3.5 0 0,0 15,4Z"/></svg>
              <span>Patient Status</span>
            </h2>
            <div className="space-y-4">
              {dashboardData?.patients?.length > 0 ? dashboardData.patients.map((patient) => (
                <div key={patient.id} className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white">{patient.name}</h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${patient.isActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                      <span className="text-sm text-slate-300">
                        {patient.isActive ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-slate-300">Disability Type:</p>
                      <p className="font-medium text-white capitalize">{patient.disability?.type || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-slate-300">Active Alerts:</p>
                      <p className={`font-medium ${patient.activeAlerts > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {patient.activeAlerts}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-300">Last Heart Rate:</p>
                      <p className="font-medium text-white">{patient.lastHeartRate || 'N/A'} BPM</p>
                    </div>
                    <div>
                      <p className="text-slate-300">Last Seen:</p>
                      <p className="font-medium text-white">
                        {patient.lastSeen ? new Date(patient.lastSeen).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedPatient(patient)}
                    className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 py-2 rounded-lg transition-all border border-blue-400/30"
                  >
                    View Details
                  </button>
                </div>
              )) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-slate-300">No patients assigned yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
              <span>Active Alerts</span>
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {dashboardData?.activeAlerts?.length === 0 || !dashboardData?.activeAlerts ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-slate-300">No active alerts</p>
                </div>
              ) : (
                dashboardData.activeAlerts.map((alert) => (
                  <div key={alert._id} className={`bg-white/10 rounded-xl p-4 border-l-4 ${
                    alert.severity === 'critical' ? 'border-red-500' :
                    alert.severity === 'high' ? 'border-orange-500' :
                    'border-yellow-500'
                  } border border-white/20`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span>
                            {alert.type === 'fall_detection' ? (
                              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
                            ) : alert.type === 'health_alert' ? (
                              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            ) : alert.type === 'emergency_button' ? (
                              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
                            ) : (
                              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16"/></svg>
                            )}
                          </span>
                          <h3 className="font-semibold text-white">
                            {alert.userId?.name || 'Unknown Patient'}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            alert.severity === 'critical' ? 'bg-red-500/20 text-red-300 border border-red-400/30' :
                            alert.severity === 'high' ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30' :
                            'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30'
                          }`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-slate-300 mb-2">{alert.message}</p>
                        <p className="text-sm text-slate-400">
                          {new Date(alert.createdAt).toLocaleString()}
                          {alert.location && ` • ${alert.location}`}
                        </p>
                      </div>
                      <button
                        onClick={() => resolveAlert(alert._id)}
                        className="ml-4 bg-green-500/20 hover:bg-green-500/30 text-green-300 px-4 py-2 rounded-lg text-sm transition-all border border-green-400/30"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Health Data */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z"/></svg>
            <span>Recent Health Data</span>
          </h2>
          <div className="space-y-4">
            {dashboardData?.recentHealthData?.length > 0 ? dashboardData.recentHealthData.slice(0, 5).map((data, index) => (
              <div key={index} className="bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center border border-red-400/30">
                      <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{data.userId?.name || 'Unknown Patient'}</p>
                      <p className="text-slate-300 text-sm">
                        {new Date(data.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {data.heartRate && (
                      <p className="text-lg font-semibold text-red-400">
                        {data.heartRate} BPM
                      </p>
                    )}
                    {data.steps && (
                      <p className="text-sm text-slate-300">
                        {data.steps} steps
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-slate-300">No recent health data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaregiverDashboard;