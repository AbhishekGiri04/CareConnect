import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccessibility } from '../context/AccessibilityContext';
import api, { deviceAPI, dashboardAPI } from '../services/api';
import { database } from '../firebase/config';
import { ref, set, onValue, off } from 'firebase/database';
import io from 'socket.io-client';
import VoiceControl from '../components/VoiceControl';
import GlobalAccessibility from '../components/GlobalAccessibility';
import SafetyStatus from '../components/SafetyStatus';
import '../accessibility.css';

const DeviceControl = () => {
  const navigate = useNavigate();
  const { settings, toggleSetting, announceToScreenReader } = useAccessibility();
  const [devices, setDevices] = useState([
    { _id: '1', name: 'Living Room Light', type: 'light', status: false, location: 'Living Room', online: true, firebaseKey: 'LED1' },
    { _id: '2', name: 'Bedroom Fan', type: 'fan', status: false, location: 'Bedroom', online: true, firebaseKey: 'LED2' },
    { _id: '3', name: 'Kitchen Light', type: 'light', status: false, location: 'Kitchen', online: true, firebaseKey: 'LED3' },
    { _id: '4', name: 'Motion Sensor', type: 'sensor', status: false, location: 'Bathroom', online: true, firebaseKey: 'LED4' }
  ]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [gasStatus, setGasStatus] = useState(0);
  const [temperatureStatus, setTemperatureStatus] = useState('NORMAL');
  const [pirData, setPirData] = useState({});
  const [motionHistory, setMotionHistory] = useState([
    { count: 0, location: 'bedroom', timestamp: '2024-01-15T10:40:15Z' },
    { count: 0, location: 'living_room', timestamp: '2024-01-15T10:45:30Z' },
    { count: 2, location: 'Living Room', timestamp: '10:31:42 AM' },
    { count: 2, location: 'Living Room', timestamp: '10:31:44 AM' }
  ]);
  
  const [currentLEDStates, setCurrentLEDStates] = useState({ LED1: 0, LED2: 0, LED3: 0, LED4: 0 });

  useEffect(() => {
    // Initialize Firebase listeners
    initFirebaseListeners();
    
    // Initialize socket
    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5004');
    setSocket(newSocket);

    // Load devices
    loadDevices();

    // Socket listeners
    newSocket.on('device_update', (updatedDevice) => {
      setDevices(prev => prev.map(d => 
        d._id === updatedDevice._id ? updatedDevice : d
      ));
    });

    newSocket.on('mqtt_message', (data) => {
      if (data.topic === 'smartassist/status') {
        updateDeviceFromMQTT(data.data);
      }
    });
    
    // Keyboard shortcuts
    const handleKeyPress = (event) => {
      const key = event.key;
      if (['1', '2', '3', '4'].includes(key)) {
        event.preventDefault();
        toggleDeviceByKeyboard(parseInt(key));
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    
    // Simulate motion detection updates
    const motionInterval = setInterval(() => {
      const locations = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom'];
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];
      const randomCount = Math.floor(Math.random() * 3);
      
      const newMotion = {
        count: randomCount,
        location: randomLocation,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMotionHistory(prev => [newMotion, ...prev.slice(0, 9)]); // Keep last 10 entries
    }, 30000); // Update every 30 seconds

    return () => {
      newSocket.disconnect();
      clearInterval(motionInterval);
      document.removeEventListener('keydown', handleKeyPress);
      // Clean up Firebase listeners
      cleanupFirebaseListeners();
    };
  }, []);
  

  
  // Emergency All Lights Function
  const emergencyAllLights = () => {
    devices.forEach(device => {
      if (device.type === 'light') {
        controlDevice(device._id, 'on', 'light');
      }
    });
    
    // Strong vibration for emergency
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    // Screen reader announcement
    announceToScreenReader('Emergency activated. All lights are now on.');
    
    // Visual flash for deaf users
    document.body.style.backgroundColor = '#ff0000';
    setTimeout(() => {
      document.body.style.backgroundColor = '';
    }, 500);
  };

  const loadDevices = async () => {
    try {
      const response = await dashboardAPI.getDevices();
      if (response.data.success) {
        const deviceList = response.data.data || [
          { _id: '1', name: 'Living Room Light', type: 'light', status: false, location: 'Living Room', online: true },
          { _id: '2', name: 'Bedroom Fan', type: 'fan', status: false, location: 'Bedroom', online: true },
          { _id: '3', name: 'Kitchen Light', type: 'light', status: false, location: 'Kitchen', online: true },
          { _id: '4', name: 'Motion Sensor', type: 'sensor', status: false, location: 'Bathroom', online: true }
        ];
        setDevices(deviceList);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      // Fallback devices
      setDevices([
        { _id: '1', name: 'Living Room Light', type: 'light', status: false, location: 'Living Room', online: true },
        { _id: '2', name: 'Bedroom Fan', type: 'fan', status: false, location: 'Bedroom', online: true },
        { _id: '3', name: 'Kitchen Light', type: 'light', status: false, location: 'Kitchen', online: true },
        { _id: '4', name: 'Motion Sensor', type: 'sensor', status: false, location: 'Bathroom', online: true }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const updateDeviceFromMQTT = (mqttData) => {
    setDevices(prev => prev.map(device => {
      if (device.deviceId === mqttData.device_id) {
        return {
          ...device,
          state: mqttData.light ? 'on' : 'off',
          online: true,
          lastActivity: new Date(),
          signalStrength: mqttData.wifi_strength
        };
      }
      return device;
    }));
  };

  // Firebase listeners
  const initFirebaseListeners = () => {
    // Listen for LED status changes
    ['LED1', 'LED2', 'LED3', 'LED4'].forEach(ledKey => {
      const ledRef = ref(database, ledKey);
      onValue(ledRef, (snapshot) => {
        const status = snapshot.val();
        setDevices(prev => prev.map(d => 
          d.firebaseKey === ledKey ? { ...d, status: status === 1, state: status === 1 ? 'on' : 'off' } : d
        ));
      });
    });
    
    // Listen for gas leak status
    const gasRef = ref(database, 'GASLEAK');
    onValue(gasRef, (snapshot) => {
      setGasStatus(snapshot.val() || 0);
    });
    
    // Listen for PIR sensor data
    const pirRef = ref(database, 'PIR_SENSORS');
    onValue(pirRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPirData(data);
        // Update motion history with real PIR data
        Object.keys(data).forEach(sensorId => {
          const sensorData = data[sensorId];
          if (sensorData && sensorData.people_count !== undefined) {
            const newMotion = {
              count: sensorData.people_count,
              location: getRoomName(sensorId),
              timestamp: new Date().toLocaleTimeString(),
              sensorId: sensorId
            };
            setMotionHistory(prev => {
              // Avoid duplicates
              const exists = prev.some(m => 
                m.sensorId === sensorId && 
                m.count === sensorData.people_count &&
                Math.abs(new Date() - new Date(m.timestamp)) < 30000
              );
              if (!exists) {
                return [newMotion, ...prev.slice(0, 9)];
              }
              return prev;
            });
          }
        });
      }
    });
    
    // Listen for temperature data
    const tempRef = ref(database, 'TEMPERATURE');
    onValue(tempRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let hasAlert = false;
        Object.keys(data).forEach(room => {
          const roomData = data[room];
          if (roomData && roomData.value && (roomData.value > 30 || roomData.value < 10)) {
            hasAlert = true;
          }
        });
        setTemperatureStatus(hasAlert ? 'ALERT' : 'NORMAL');
      }
    });
  };
  
  const cleanupFirebaseListeners = () => {
    ['LED1', 'LED2', 'LED3', 'LED4'].forEach(ledKey => {
      off(ref(database, ledKey));
    });
    off(ref(database, 'GASLEAK'));
    off(ref(database, 'PIR_SENSORS'));
    off(ref(database, 'TEMPERATURE'));
  };
  
  const getRoomName = (sensorId) => {
    const roomMap = {
      'PIR_1': 'Living Room',
      'PIR_2': 'Bedroom', 
      'PIR_3': 'Kitchen'
    };
    return roomMap[sensorId] || 'Smart Home';
  };

  const controlDevice = async (deviceId, action, deviceType = 'light') => {
    try {
      const device = devices.find(d => d._id === deviceId);
      if (!device) return;
      
      // Control via Firebase
      if (device.firebaseKey) {
        const ledRef = ref(database, device.firebaseKey);
        await set(ledRef, action === 'on' ? 1 : 0);
        
        console.log(`✅ Firebase: ${device.firebaseKey} set to ${action === 'on' ? 1 : 0}`);
      }
      
      // Update local state immediately for better UX
      setDevices(prev => prev.map(d => 
        d._id === deviceId ? { ...d, status: action === 'on', state: action, lastActivity: new Date() } : d
      ));
      
      // Enhanced audio feedback with screen reader support
      const deviceName = device.name || 'Device';
      announceToScreenReader(`${deviceName} turned ${action}`);
      
      // Vibration feedback for deaf users
      if (settings.vibrationAlerts && navigator.vibrate) {
        navigator.vibrate(action === 'on' ? [100, 50, 100] : [200]);
      }
      
      // Update LED states for accessibility
      if (device.firebaseKey) {
        setCurrentLEDStates(prev => ({
          ...prev,
          [device.firebaseKey]: action === 'on' ? 1 : 0
        }));
      }
      
      // Add to motion history for activity tracking
      const newMotion = {
        count: 1,
        location: deviceName,
        timestamp: new Date().toLocaleTimeString(),
        action: `${deviceName} ${action.toUpperCase()}`
      };
      setMotionHistory(prev => [newMotion, ...prev.slice(0, 9)]);
      
      console.log(`✅ ${deviceName} turned ${action.toUpperCase()}`);
      
    } catch (error) {
      console.error('Error controlling device:', error);
      
      // Fallback to API if Firebase fails
      try {
        const response = await deviceAPI.control(deviceId, {
          action,
          device_type: deviceType
        });
        console.log('Fallback API call successful');
      } catch (apiError) {
        console.error('Both Firebase and API failed:', apiError);
      }
    }
  };
  
  const toggleDeviceByKeyboard = (deviceNumber) => {
    if (deviceNumber >= 1 && deviceNumber <= devices.length) {
      const device = devices[deviceNumber - 1];
      const newAction = isDeviceOn(device) ? 'off' : 'on';
      controlDevice(device._id, newAction, device.type);
      
      // Additional keyboard feedback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(`Keyboard shortcut ${deviceNumber}: ${device.name} ${newAction}`);
        speechSynthesis.speak(utterance);
      }
    }
  };

  const getDeviceIcon = (name, type) => {
    if (name?.toLowerCase().includes('living')) return '💡';
    if (name?.toLowerCase().includes('bedroom')) return '🛌';
    if (name?.toLowerCase().includes('kitchen')) return '🍳';
    if (name?.toLowerCase().includes('bathroom')) return '🚿';
    
    switch (type) {
      case 'light': return '💡';
      case 'fan': return '🌀';
      case 'sensor': return '📡';
      case 'camera': return '📹';
      default: return '🔌';
    }
  };

  const getStatusColor = (device) => {
    if (!device.online) return 'bg-gray-500';
    const isOn = device.status || device.state === 'on';
    return isOn ? 'bg-green-500' : 'bg-red-500';
  };
  
  const isDeviceOn = (device) => {
    return device.status || device.state === 'on';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading devices...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://img.freepik.com/free-photo/home-automation-with-objects-desk_23-2148994151.jpg?semt=ais_hybrid&w=740&q=80)'
        }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      
      <div className="relative z-10 pt-56 p-4 md:p-6 pb-24" style={{zIndex: 10}}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl" style={{marginTop: '4rem'}}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/></svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Device Control</h1>
              <p className="text-white/80">Manage your smart home devices</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-white/20 text-white px-6 py-3 rounded-xl border border-white/30 hover:bg-white/30 transition-all backdrop-blur-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
        

      </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => {
              devices.forEach(d => d.type === 'light' && controlDevice(d._id, 'on', 'light'));
              if ('speechSynthesis' in window) {
                speechSynthesis.speak(new SpeechSynthesisUtterance('All lights turned on'));
              }
            }}
            className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white p-6 rounded-3xl hover:scale-105 transition-all shadow-2xl hover:shadow-yellow-500/50"
          >
            <div className="text-4xl mb-3">💡</div>
            <div className="font-bold text-lg">All Lights ON</div>
          </button>
          
          <button
            onClick={() => {
              devices.forEach(d => d.type === 'light' && controlDevice(d._id, 'off', 'light'));
              if ('speechSynthesis' in window) {
                speechSynthesis.speak(new SpeechSynthesisUtterance('All lights turned off'));
              }
            }}
            className="bg-gradient-to-br from-slate-600 to-slate-800 text-white p-6 rounded-3xl hover:scale-105 transition-all shadow-2xl hover:shadow-slate-500/50"
          >
            <div className="text-4xl mb-3">🌙</div>
            <div className="font-bold text-lg">All Lights OFF</div>
          </button>
          
          <button
            onClick={() => {
              const fan = devices.find(d => d.type === 'fan');
              if (fan) {
                controlDevice(fan._id, 'on', 'fan');
                if ('speechSynthesis' in window) {
                  speechSynthesis.speak(new SpeechSynthesisUtterance(`${fan.name} turned on`));
                }
              }
            }}
            className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-6 rounded-3xl hover:scale-105 transition-all shadow-2xl hover:shadow-blue-500/50"
          >
            <div className="text-4xl mb-3">🌀</div>
            <div className="font-bold text-lg">Bedroom Fan ON</div>
          </button>
          
          <button
            onClick={emergencyAllLights}
            className="bg-gradient-to-br from-red-500 to-pink-600 text-white p-6 rounded-3xl hover:scale-105 transition-all shadow-2xl hover:shadow-red-500/50 animate-pulse accessibility-button"
            aria-label="Emergency - Turn all lights on"
          >
            <div className="text-4xl mb-3">⚠️</div>
            <div className="font-bold text-lg">EMERGENCY</div>
            <div className="text-sm opacity-90">ALL LIGHTS ON</div>
          </button>
        </div>


        
        {/* Large Touch Device Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {devices.map((device) => (
            <div key={device._id} className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl hover:scale-105 transition-all">
              <div className="text-center">
                <div className="text-6xl mb-4">{getDeviceIcon(device.name, device.type)}</div>
                <h3 className="text-white font-bold text-xl mb-2">{device.name}</h3>
                <div className={`text-lg font-semibold mb-4 ${
                  isDeviceOn(device) ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isDeviceOn(device) ? 'ON' : 'OFF'}
                </div>
                <button
                  onClick={() => controlDevice(device._id, isDeviceOn(device) ? 'off' : 'on', device.type)}
                  className={`accessibility-button w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all shadow-lg ${
                    isDeviceOn(device)
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 active'
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                  }`}
                  aria-label={`${isDeviceOn(device) ? 'Turn off' : 'Turn on'} ${device.name}`}
                >
                  {isDeviceOn(device) ? 'TURN OFF' : 'TURN ON'}
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Keyboard Shortcuts Help */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 mb-8 shadow-2xl">
          <div className="flex items-center space-x-3 mb-4">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/></svg>
            <h3 className="text-white font-bold text-xl">Keyboard Shortcuts Help</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {devices.map((device, index) => (
              <div 
                key={device._id} 
                className="bg-white/10 rounded-xl p-3 border border-white/20 hover:bg-white/15 transition-all cursor-pointer accessibility-button" 
                onClick={() => toggleDeviceByKeyboard(index + 1)}
                role="button"
                tabIndex={0}
                aria-label={`Keyboard shortcut ${index + 1}: ${device.name} is ${isDeviceOn(device) ? 'on' : 'off'}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleDeviceByKeyboard(index + 1);
                  }
                }}
              >
                <p className="text-white font-medium">{device.name}</p>
                <p className="text-slate-300 text-sm mt-1">Press {index + 1} to toggle</p>
                <div className="flex items-center justify-between mt-2">
                  <div className={`status-indicator ${
                    isDeviceOn(device) ? 'active' : 'inactive'
                  }`}>
                    <span className={`font-bold ${
                      isDeviceOn(device) ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {isDeviceOn(device) ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    isDeviceOn(device) ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>


        
        {/* Motion Detection */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 mb-8 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-xl flex items-center space-x-2">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L9 8.3V13h2V9.6l1.8-.7"/></svg>
              <span>Motion Detection</span>
            </h3>
            <button 
              onClick={() => {
                setMotionHistory([]);
                announceToScreenReader('Motion history cleared');
              }}
              className="accessibility-button bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 px-4 py-2 rounded-xl border border-red-400/30 hover:bg-red-500/30 transition-all"
              aria-label="Clear motion detection history"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                <span>Clear History</span>
              </div>
            </button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {motionHistory.length > 0 ? motionHistory.map((motion, index) => (
              <div key={index} className="bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {motion.count} people detected near PIR sensor
                    </p>
                    <p className="text-slate-300 text-sm">Location: {motion.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-sm">{motion.timestamp}</p>
                    <div className={`w-3 h-3 rounded-full mt-1 ml-auto ${
                      motion.count > 0 ? 'bg-green-400' : 'bg-slate-500'
                    }`}></div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/></svg>
                <p className="text-slate-400">No motion detected recently</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Voice Control */}
        <VoiceControl 
          devices={devices} 
          onDeviceControl={(command, response) => {
            console.log('Voice command executed:', command, response);
            // Add to motion history for activity tracking
            const newMotion = {
              count: 1,
              location: 'Voice Control',
              timestamp: new Date().toLocaleTimeString(),
              action: `Voice: ${command}`
            };
            setMotionHistory(prev => [newMotion, ...prev.slice(0, 9)]);
          }}
        />
      </div>
    </div>
  );
};

export default DeviceControl;