import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import VoiceControl from '../components/VoiceControl';
import GlobalAccessibility from '../components/GlobalAccessibility';
import SafetyStatus from '../components/SafetyStatus';
import api, { dashboardAPI, deviceAPI } from '../services/api';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({ devices: 4, alerts: 0, energy: 92, temperature: 72, batteryLevel: null });
  const [recentActivity, setRecentActivity] = useState([
    { id: 1, type: 'device', action: 'Living Room Light turned ON', time: '2 minutes ago' },
    { id: 2, type: 'voice', action: 'Voice command: "Turn on kitchen light"', time: '5 minutes ago' },
    { id: 3, type: 'gesture', action: 'Wave gesture detected - All lights OFF', time: '8 minutes ago' },
    { id: 4, type: 'security', action: 'Face recognition: John Doe authorized', time: '12 minutes ago' },
    { id: 5, type: 'device', action: 'Bedroom Fan turned OFF', time: '15 minutes ago' }
  ]);
  const [devices, setDevices] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [socket, setSocket] = useState(null);
  const [weather, setWeather] = useState({ temp: '18°C', condition: 'Clear sky', location: 'Dehradun, India' });
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [accessibilitySettings, setAccessibilitySettings] = useState({
    highContrast: false,
    largeText: false,
    screenReader: false,
    vibrationAlerts: false
  });
  const [screenReaderAnnounced, setScreenReaderAnnounced] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Battery API to get laptop battery level
  useEffect(() => {
    const getBatteryInfo = async () => {
      try {
        if ('getBattery' in navigator) {
          const battery = await navigator.getBattery();
          const batteryPercent = Math.round(battery.level * 100);
          console.log(`🔋 Battery Level: ${batteryPercent}%`);
          
          setStats(prev => ({ ...prev, energy: batteryPercent, batteryLevel: batteryPercent }));
          
          // Update battery info when it changes
          battery.addEventListener('levelchange', () => {
            const newBatteryPercent = Math.round(battery.level * 100);
            console.log(`🔋 Battery Level Updated: ${newBatteryPercent}%`);
            setStats(prev => ({ ...prev, energy: newBatteryPercent, batteryLevel: newBatteryPercent }));
          });
        } else {
          console.log('❌ Battery API not supported');
        }
      } catch (error) {
        console.log('❌ Battery API error:', error);
      }
    };
    
    getBatteryInfo();
  }, []);

  useEffect(() => {
    // Connect to SmartAssist backend through CareConnect proxy
    const fetchBackendData = async () => {
      try {
        console.log('Fetching real-time data from SmartAssist backend...');
        
        // Get dashboard stats from backend
        const statsResponse = await dashboardAPI.getStats();
        if (statsResponse.data.success) {
          const backendStats = statsResponse.data.data;
          setStats(prev => ({
            ...prev,
            devices: backendStats.devices || 4,
            alerts: backendStats.alerts || 0,
            energy: backendStats.energy || 92
          }));
          console.log('✅ Connected to SmartAssist backend:', backendStats);
        }
        
        // Get device list for more detailed info
        const devicesResponse = await dashboardAPI.getDevices();
        if (devicesResponse.data.success) {
          const deviceList = devicesResponse.data.data || [];
          setDevices(deviceList);
          console.log('📱 Devices loaded:', deviceList.length);
        }
        
      } catch (error) {
        console.log('⚠️ SmartAssist backend not available, using default values:', error.message);
        // Keep default values when backend is not available
      }
    };
    
    fetchBackendData();
    const interval = setInterval(fetchBackendData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);
  
  // Add activity when actions are performed
  const addActivity = (type, action) => {
    const newActivity = {
      id: Date.now(),
      type: type,
      action: action,
      time: 'Just now'
    };
    setRecentActivity(prev => [newActivity, ...prev.slice(0, 9)]); // Keep last 10 activities
  };

  // Load accessibility settings from backend
  useEffect(() => {
    const loadAccessibilitySettings = async () => {
      try {
        const response = await api.get('/accessibility/settings');
        if (response.data.success) {
          setAccessibilitySettings(response.data.data);
        }
      } catch (error) {
        console.log('Loading default accessibility settings');
      }
    };
    loadAccessibilitySettings();
  }, []);

  const toggleAccessibility = async (setting) => {
    const newSettings = {
      ...accessibilitySettings,
      [setting]: !accessibilitySettings[setting]
    };
    
    // Update state immediately
    setAccessibilitySettings(newSettings);
    
    // Apply settings immediately to DOM
    applyAccessibilitySettings(newSettings);
    
    // Add to recent activity
    const settingNames = {
      highContrast: 'High Contrast',
      largeText: 'Large Text',
      screenReader: 'Screen Reader',
      vibrationAlerts: 'Vibration Alerts'
    };
    const status = newSettings[setting] ? 'enabled' : 'disabled';
    addActivity('device', `${settingNames[setting]} ${status}`);
    
    // Voice feedback for the action
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`${settingNames[setting]} ${status}`);
      utterance.rate = 0.8;
      utterance.volume = 0.9;
      speechSynthesis.speak(utterance);
    }
    
    // Vibration feedback
    if (navigator.vibrate && (setting === 'vibrationAlerts' || newSettings.vibrationAlerts)) {
      navigator.vibrate([100, 50, 100]);
    }
    
    // Save to backend
    try {
      const response = await api.post('/accessibility/settings', newSettings);
      if (response.data.success) {
        console.log(`✅ ${setting} ${newSettings[setting] ? 'ENABLED' : 'DISABLED'} and saved to backend`);
      }
    } catch (error) {
      console.error('❌ Failed to save accessibility settings:', error);
      // Revert if save failed
      setAccessibilitySettings(accessibilitySettings);
      applyAccessibilitySettings(accessibilitySettings);
    }
  };

  const applyAccessibilitySettings = (settings) => {
    const body = document.body;
    const root = document.documentElement;
    
    // High Contrast - Apply immediately with force
    if (settings.highContrast) {
      body.classList.add('high-contrast');
      
      // Remove existing style if any
      const existingStyle = document.getElementById('high-contrast-override');
      if (existingStyle) existingStyle.remove();
      
      // Create comprehensive high contrast override
      const style = document.createElement('style');
      style.id = 'high-contrast-override';
      style.textContent = `
        /* High Contrast Override - Dark theme */
        body.high-contrast,
        body.high-contrast *,
        body.high-contrast *::before,
        body.high-contrast *::after {
          background: #2d2d2d !important;
          background-color: #2d2d2d !important;
          background-image: none !important;
          color: #ffffff !important;
          border-color: #ffffff !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }
        
        /* Buttons */
        body.high-contrast button,
        body.high-contrast .accessibility-button {
          background: #1a1a1a !important;
          background-color: #1a1a1a !important;
          color: #ffffff !important;
          border: 2px solid #ffffff !important;
          font-weight: bold !important;
        }
        
        body.high-contrast button:hover,
        body.high-contrast button.active,
        body.high-contrast .accessibility-button:hover,
        body.high-contrast .accessibility-button.active {
          background: #0000ff !important;
          background-color: #0000ff !important;
          color: #ffffff !important;
          border: 3px solid #ffffff !important;
        }
        
        /* Cards and containers */
        body.high-contrast .glass,
        body.high-contrast .bg-gradient-to-br,
        body.high-contrast .bg-gradient-to-r,
        body.high-contrast [class*="bg-"] {
          background: #3a3a3a !important;
          background-color: #3a3a3a !important;
          border: 2px solid #ffffff !important;
        }
        
        /* Text colors */
        body.high-contrast .text-white,
        body.high-contrast .text-slate-300,
        body.high-contrast .text-slate-400,
        body.high-contrast .text-blue-300,
        body.high-contrast .text-green-300,
        body.high-contrast .text-red-300,
        body.high-contrast .text-purple-300,
        body.high-contrast .text-orange-300 {
          color: #ffffff !important;
        }
        
        /* Focus states */
        body.high-contrast *:focus {
          outline: 4px solid #0000ff !important;
          outline-offset: 2px !important;
        }
      `;
      document.head.appendChild(style);
      
      // Force repaint
      body.style.display = 'none';
      body.offsetHeight; // Trigger reflow
      body.style.display = '';
      
      console.log('🔆 High Contrast: ENABLED');
    } else {
      body.classList.remove('high-contrast');
      
      // Remove high contrast override
      const existingStyle = document.getElementById('high-contrast-override');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      // Force repaint
      body.style.display = 'none';
      body.offsetHeight; // Trigger reflow
      body.style.display = '';
      
      console.log('🔆 High Contrast: DISABLED');
    }
    
    // Large Text - Apply immediately
    if (settings.largeText) {
      body.classList.add('large-text');
      
      // Remove existing style if any
      const existingStyle = document.getElementById('large-text-override');
      if (existingStyle) existingStyle.remove();
      
      // Apply large text styles
      const style = document.createElement('style');
      style.id = 'large-text-override';
      style.textContent = `
        body.large-text {
          font-size: 1.1em !important;
        }
        body.large-text *:not(.text-xs):not(.text-sm):not(.text-lg):not(.text-xl):not(.text-2xl):not(.text-3xl):not(.text-4xl) {
          font-size: 1.1em !important;
        }
        body.large-text .text-xs { font-size: 0.9rem !important; }
        body.large-text .text-sm { font-size: 1rem !important; }
        body.large-text .text-base { font-size: 1.1rem !important; }
        body.large-text .text-lg { font-size: 1.3rem !important; }
        body.large-text .text-xl { font-size: 1.5rem !important; }
        body.large-text .text-2xl { font-size: 1.8rem !important; }
        body.large-text .text-3xl { font-size: 2.2rem !important; }
        body.large-text .text-4xl { font-size: 2.8rem !important; }
        body.large-text button {
          padding: 0.8rem 1.2rem !important;
          font-size: 1.1rem !important;
        }
      `;
      document.head.appendChild(style);
      
      console.log('🔍 Large Text: ENABLED');
    } else {
      body.classList.remove('large-text');
      
      // Remove large text override
      const existingStyle = document.getElementById('large-text-override');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      console.log('🔍 Large Text: DISABLED');
    }
    
    // Screen Reader - Apply immediately with comprehensive announcements
    if (settings.screenReader) {
      body.setAttribute('aria-live', 'polite');
      body.setAttribute('role', 'main');
      body.classList.add('screen-reader-enabled');
      
      // Screen reader announcement - only once per session
      if ('speechSynthesis' in window && !screenReaderAnnounced) {
        setScreenReaderAnnounced(true);
        setTimeout(() => {
          const announcement = `Screen reader mode activated. Welcome to CareConnect Dashboard. 
          You have access to the following features: 
          Device Control for managing lights and fans, 
          Gesture Control for motion-based interaction, 
          Voice Control for speech commands, 
          Health Alerts for monitoring, 
          Security system with face recognition, 
          Analytics for usage data, 
          Emergency access for SOS, 
          and Accessibility settings. 
          Current system status: ${stats.devices} devices connected, ${stats.alerts} alerts active, ${stats.energy}% energy efficiency. 
          All actions and navigation will be announced. Use tab key to navigate between controls.`;
          
          const utterance = new SpeechSynthesisUtterance(announcement);
          utterance.rate = 0.7;
          utterance.volume = 0.9;
          speechSynthesis.speak(utterance);
        }, 1000);
      }
      
      console.log('🔊 Screen Reader: ENABLED with full system overview');
    } else {
      body.removeAttribute('aria-live');
      body.removeAttribute('role');
      body.classList.remove('screen-reader-enabled');
      console.log('🔊 Screen Reader: DISABLED');
    }
    
    // Vibration Alerts - Test when enabled
    if (settings.vibrationAlerts) {
      body.classList.add('vibration-enabled');
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      console.log('📳 Vibration Alerts: ENABLED');
    } else {
      body.classList.remove('vibration-enabled');
      console.log('📳 Vibration Alerts: DISABLED');
    }
  };

  // Apply settings on component mount and when they change
  useEffect(() => {
    applyAccessibilitySettings(accessibilitySettings);
  }, [accessibilitySettings]);
  
  // Load settings from backend on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/accessibility/settings');
        if (response.data.success) {
          const backendSettings = response.data.data;
          setAccessibilitySettings(backendSettings);
          applyAccessibilitySettings(backendSettings);
          console.log('✅ Accessibility settings loaded from backend:', backendSettings);
        }
      } catch (error) {
        console.log('Using default accessibility settings');
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    // Fetch weather data based on user's current location
    const fetchWeather = async () => {
      try {
        console.log('🌍 Requesting location permission...');
        // Get user's current location with high accuracy
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            console.log('📍 Location obtained:', position.coords);
            const { latitude, longitude } = position.coords;
            
            const API_KEY = 'c759d20c309e70722f5b9cdabdf61e2f';
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`);
            const data = await response.json();
            
            const temp = Math.round(data.main.temp);
            const condition = data.weather[0].description;
            const cityName = data.name;
            const countryName = data.sys.country;
            
            // Capitalize first letter of city name
            const formattedCity = cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();
            
            console.log(`🌡️ Weather for ${formattedCity}: ${temp}°C, ${condition}`);
            
            setWeather({
              temp: `${temp}°C`,
              condition: condition,
              location: `${formattedCity}, ${countryName}`
            });
            
            // Update stats with real temperature
            setStats(prev => ({ ...prev, temperature: temp }));
          }, (error) => {
            console.log('❌ Location access denied or failed:', error.message);
            console.log('🔄 Falling back to default location');
            // Fallback to default location if geolocation fails
            fetchDefaultWeather();
          }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          });
        } else {
          console.log('❌ Geolocation not supported, using default location');
          fetchDefaultWeather();
        }
      } catch (error) {
        console.log('❌ Weather fetch failed:', error);
        fetchDefaultWeather();
      }
    };
    
    const fetchDefaultWeather = async () => {
      try {
        console.log('🏠 Using default location: Dehradun');
        const API_KEY = 'c759d20c309e70722f5b9cdabdf61e2f';
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Dehradun,Uttarakhand,IN&appid=${API_KEY}&units=metric`);
        const data = await response.json();
        const temp = Math.round(data.main.temp);
        const condition = data.weather[0].description;
        
        setWeather({
          temp: `${temp}°C`,
          condition: condition,
          location: 'Dehradun, India'
        });
        
        setStats(prev => ({ ...prev, temperature: temp }));
      } catch (error) {
        console.log('❌ Default weather fetch failed:', error);
      }
    };
    
    // Immediate fetch on component mount
    fetchWeather();
    
    // Set up interval for periodic updates
    const interval = setInterval(fetchWeather, 600000); // Update every 10 minutes
    return () => clearInterval(interval);
  }, []);

  const getWeatherDescription = (code) => {
    const descriptions = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
      55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
      71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow'
    };
    return descriptions[code] || 'Unknown';
  };

  return (
    <div className="min-h-screen relative">
      {/* HD Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://ayushya.in/wp-content/uploads/2022/04/what_is_home_health_care_getty_creative.jpeg.jpg)'
        }}
      >
        <div className="absolute inset-0 bg-black/10"></div>
      </div>
      
      <div className="relative z-10 pt-56 p-4 md:p-6 pb-24" style={{zIndex: 10}}>
      {/* Premium Header */}
      <div className="glass rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden" style={{marginTop: '4rem'}}>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2">
                  <img src="https://png.pngtree.com/template/20190316/ourmid/pngtree-hand-care-logo-image_77695.jpg" alt="CareConnect Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold text-white">Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.displayName?.replace(/\d+/g, '') || user?.name?.replace(/\d+/g, '') || 'User'}</h1>
                  <p className="text-white/80 text-sm md:text-base">{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <p className="text-white/70 text-lg">CareConnect Smart Home - Your ecosystem is optimized and secure</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-white/70 text-sm">{weather.temp}, {weather.condition}</p>
                <p className="text-white/70 text-sm">Dehradun, India</p>
                <p className="text-white/70 text-sm">Current Time</p>
                <p className="text-white font-mono text-xl">{currentTime.toLocaleTimeString()}</p>
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (window.speechSynthesis) {
                    const utterance = new SpeechSynthesisUtterance('Logging out. Goodbye!');
                    utterance.rate = 0.8;
                    speechSynthesis.speak(utterance);
                  }
                  setTimeout(() => {
                    logout();
                    navigate('/login');
                  }, 1000);
                }}
                className="btn-secondary text-white px-8 py-4 rounded-2xl flex items-center space-x-3 font-medium cursor-pointer"
              >
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 card-hover relative overflow-hidden group shadow-lg">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/></svg>
              </div>
              <div className="bg-emerald-100 border border-emerald-300 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">+2 today</div>
            </div>
            <p className="text-gray-600 text-sm mb-2 font-medium">Connected Devices</p>
            <p className="text-4xl font-bold text-gray-800 mb-1">{stats.devices}</p>
            <p className="text-xs text-gray-500 mt-1">SmartAssist Connected</p>
            
            <div className="w-full bg-blue-200 rounded-full h-2 mt-3">
              <div className="bg-blue-500 h-2 rounded-full shadow-sm" style={{width: '85%'}}></div>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 card-hover relative overflow-hidden group shadow-lg">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
              </div>
              <div className="bg-red-100 border border-red-300 text-red-700 text-xs font-semibold px-3 py-1 rounded-full animate-pulse">Active</div>
            </div>
            <p className="text-gray-600 text-sm mb-2 font-medium">Security Alerts</p>
            <p className="text-4xl font-bold text-gray-800 mb-1">{stats.alerts}</p>
            <div className="w-full bg-red-200 rounded-full h-2 mt-3">
              <div className="bg-red-500 h-2 rounded-full animate-pulse shadow-sm" style={{width: '25%'}}></div>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-3xl p-6 card-hover relative overflow-hidden group shadow-lg">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M15.67 4H14V2c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4.33C3.6 4 3 4.6 3 5.33v15.33C3 21.4 3.6 22 4.33 22h11.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4zM7 2h4v2H7V2zm8 18H5V6h10v14zm-3-2V8H8v10h4z"/></svg>
              </div>
              <div className="bg-green-100 border border-green-300 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">{stats.energy > 80 ? 'Excellent' : stats.energy > 50 ? 'Good' : stats.energy > 20 ? 'Low' : 'Critical'}</div>
            </div>
            <p className="text-gray-600 text-sm mb-2 font-medium">Battery Level</p>
            <p className="text-4xl font-bold text-gray-800 mb-1">{stats.energy}%</p>
            <div className="w-full bg-green-200 rounded-full h-2 mt-3">
              <div className="bg-green-500 h-2 rounded-full shadow-sm" style={{width: `${stats.energy}%`}}></div>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-3xl p-6 card-hover relative overflow-hidden group shadow-lg">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-4-2V5c0-.55.45-1 1-1s1 .45 1 1v6h-2z"/></svg>
              </div>
              <div className="bg-orange-100 border border-orange-300 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">Optimal</div>
            </div>
            <p className="text-gray-600 text-sm mb-2 font-medium">Temperature</p>
            <p className="text-4xl font-bold text-gray-800 mb-1">{weather.temp}</p>
            <div className="w-full bg-orange-200 rounded-full h-2 mt-3">
              <div className="bg-orange-500 h-2 rounded-full shadow-sm" style={{width: '70%'}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Home Safety Status */}
      <div className="bg-white/95 backdrop-blur-xl border border-white/30 rounded-3xl p-6 mb-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.1 16,12.7V16.2C16,16.8 15.4,17.3 14.8,17.3H9.2C8.6,17.3 8,16.8 8,16.2V12.7C8,12.1 8.6,11.5 9.2,11.5V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,10V11.5H13.5V10C13.5,8.7 12.8,8.2 12,8.2Z"/></svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Smart Home Safety</h3>
              <p className="text-gray-600 text-sm">Real-time monitoring & security</p>
            </div>
          </div>
          <div className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-700 text-sm font-semibold px-4 py-2 rounded-full backdrop-blur-sm animate-pulse">
            All Systems Secure
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-emerald-200 rounded-2xl p-4 text-center hover:scale-105 transition-all group shadow-lg">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            </div>
            <p className="text-gray-800 text-sm font-medium mb-1">Gas Detection</p>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-emerald-600 font-bold text-lg">SAFE</p>
            </div>
            <p className="text-gray-500 text-xs mt-1">No leaks detected</p>
          </div>
          
          <div className="bg-white border border-red-200 rounded-2xl p-4 text-center hover:scale-105 transition-all group shadow-lg">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11C15.4,11 16,11.4 16,12V16C16,16.6 15.6,17 15,17H9C8.4,17 8,16.6 8,16V12C8,11.4 8.4,11 9,11V10C9,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.2,9.2 10.2,10V11H13.8V10C13.8,9.2 12.8,8.2 12,8.2Z"/></svg>
            </div>
            <p className="text-gray-800 text-sm font-medium mb-1">Security System</p>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <p className="text-red-600 font-bold text-lg">STANDBY</p>
            </div>
            <p className="text-gray-500 text-xs mt-1">Ready to activate</p>
          </div>
          
          <div className="bg-white border border-blue-200 rounded-2xl p-4 text-center hover:scale-105 transition-all group shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M15 13V5C15 3.34 13.66 2 12 2S9 3.34 9 5V13C7.79 13.91 7 15.37 7 17C7 19.76 9.24 22 12 22S17 19.76 17 17C17 15.37 16.21 13.91 15 13M11 5C11 4.45 11.45 4 12 4S13 4.45 13 4V13H11V5Z"/></svg>
            </div>
            <p className="text-gray-800 text-sm font-medium mb-1">Climate Control</p>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-blue-600 font-bold text-lg">{weather.temp}</p>
            </div>
            <p className="text-gray-500 text-xs mt-1">Optimal range</p>
          </div>
          
          <div className="bg-white border border-purple-200 rounded-2xl p-4 text-center hover:scale-105 transition-all group shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/></svg>
            </div>
            <p className="text-gray-800 text-sm font-medium mb-1">Motion Sensors</p>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <p className="text-purple-600 font-bold text-lg">ACTIVE</p>
            </div>
            <p className="text-gray-500 text-xs mt-1">2 zones monitored</p>
          </div>
          
          <div className="bg-white border border-amber-200 rounded-2xl p-4 text-center hover:scale-105 transition-all group shadow-lg">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><path d="M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10A2,2 0 0,1 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/></svg>
            </div>
            <p className="text-gray-800 text-sm font-medium mb-1">Access Control</p>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <p className="text-amber-600 font-bold text-lg">SECURE</p>
            </div>
            <p className="text-gray-500 text-xs mt-1">All entries locked</p>
          </div>
        </div>
        
        <div className="mt-6 bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-200 rounded-xl flex items-center justify-center animate-pulse">
                <svg className="w-5 h-5 text-emerald-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
              <div>
                <p className="text-gray-800 font-semibold text-base">System Health: Excellent</p>
                <p className="text-emerald-700 text-sm">All systems operational • Last check: {new Date().toLocaleTimeString()}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-emerald-200 rounded-xl px-3 py-2">
                <p className="text-emerald-800 font-bold text-2xl">99.8%</p>
                <p className="text-emerald-700 text-xs font-medium">Uptime</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-2 text-center border border-gray-200">
              <p className="text-emerald-600 font-bold text-lg">24/7</p>
              <p className="text-gray-600 text-xs">Monitoring</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center border border-gray-200">
              <p className="text-blue-600 font-bold text-lg">5ms</p>
              <p className="text-gray-600 text-xs">Response</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center border border-gray-200">
              <p className="text-purple-600 font-bold text-lg">4/4</p>
              <p className="text-gray-600 text-xs">Devices</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Accessibility Controls - Always Visible */}
      <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 mb-8 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <span>♿</span>
          <span>Accessibility Controls</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => toggleAccessibility('highContrast')}
            className={`accessibility-button p-4 rounded-2xl text-sm font-medium transition-all flex flex-col items-center space-y-2 relative ${
              accessibilitySettings.highContrast 
                ? 'bg-yellow-600/30 text-yellow-300 border-2 border-yellow-400 active' 
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border-2 border-white/10'
            }`}
            aria-pressed={accessibilitySettings.highContrast}
            aria-label={`High Contrast Mode ${accessibilitySettings.highContrast ? 'enabled' : 'disabled'}`}
          >
            <span className="text-2xl" role="img" aria-label="High contrast icon">🌓</span>
            <span>High Contrast</span>
            <span className="text-xs opacity-75">{accessibilitySettings.highContrast ? 'ON' : 'OFF'}</span>
          </button>
          <button 
            onClick={() => toggleAccessibility('largeText')}
            className={`accessibility-button p-4 rounded-2xl text-sm font-medium transition-all flex flex-col items-center space-y-2 relative ${
              accessibilitySettings.largeText 
                ? 'bg-blue-600/30 text-blue-300 border-2 border-blue-400 active' 
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border-2 border-white/10'
            }`}
            aria-pressed={accessibilitySettings.largeText}
            aria-label={`Large Text Mode ${accessibilitySettings.largeText ? 'enabled' : 'disabled'}`}
          >
            <span className="text-2xl" role="img" aria-label="Large text icon">🔍</span>
            <span>Large Text</span>
            <span className="text-xs opacity-75">{accessibilitySettings.largeText ? 'ON' : 'OFF'}</span>
          </button>
          <button 
            onClick={() => toggleAccessibility('screenReader')}
            className={`accessibility-button p-4 rounded-2xl text-sm font-medium transition-all flex flex-col items-center space-y-2 relative ${
              accessibilitySettings.screenReader 
                ? 'bg-green-600/30 text-green-300 border-2 border-green-400 active' 
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border-2 border-white/10'
            }`}
            aria-pressed={accessibilitySettings.screenReader}
            aria-label={`Screen Reader Mode ${accessibilitySettings.screenReader ? 'enabled' : 'disabled'}`}
          >
            <span className="text-2xl" role="img" aria-label="Screen reader icon">🔊</span>
            <span>Screen Reader</span>
            <span className="text-xs opacity-75">{accessibilitySettings.screenReader ? 'ON' : 'OFF'}</span>
          </button>
          <button 
            onClick={() => toggleAccessibility('vibrationAlerts')}
            className={`accessibility-button p-4 rounded-2xl text-sm font-medium transition-all flex flex-col items-center space-y-2 relative ${
              accessibilitySettings.vibrationAlerts 
                ? 'bg-purple-600/30 text-purple-300 border-2 border-purple-400 active' 
                : 'bg-white/5 text-slate-300 hover:bg-white/10 border-2 border-white/10'
            }`}
            aria-pressed={accessibilitySettings.vibrationAlerts}
            aria-label={`Vibration Alerts ${accessibilitySettings.vibrationAlerts ? 'enabled' : 'disabled'}`}
          >
            <span className="text-2xl" role="img" aria-label="Vibration icon">📳</span>
            <span>Vibration Alerts</span>
            <span className="text-xs opacity-75">{accessibilitySettings.vibrationAlerts ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Premium Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Backend Controller clicked!');
            navigate('/controller');
          }}
          className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-4 md:p-6 card-hover group relative overflow-hidden shadow-2xl hover:shadow-green-500/50 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl group-hover:from-white/20 transition-all duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9l-5.91.74L12 16l-4.09-6.26L2 9l6.91-.74L12 2z"/></svg>
              </div>
              <div className="text-white/80 group-hover:text-white transition-colors text-lg md:text-xl">→</div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">Advanced Controller</h3>
            <p className="text-white/90 text-xs md:text-sm mb-2 md:mb-3">Full backend interface</p>
            <span className="bg-white/20 border border-white/30 px-2 md:px-3 py-1 rounded-full text-white text-xs backdrop-blur-sm">Enhanced</span>
          </div>
        </div>
        
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Device Control clicked!');
            navigate('/devices');
          }}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-4 md:p-6 card-hover group relative overflow-hidden shadow-2xl hover:shadow-blue-500/50 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl group-hover:from-white/20 transition-all duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/></svg>
              </div>
              <div className="text-white/80 group-hover:text-white transition-colors text-lg md:text-xl">→</div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">Device Control</h3>
            <p className="text-white/90 text-xs md:text-sm mb-2 md:mb-3">Manage lights, fans & sensors</p>
            <span className="bg-white/20 border border-white/30 px-2 md:px-3 py-1 rounded-full text-white text-xs backdrop-blur-sm">12 online</span>
          </div>
        </div>
        
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Gesture Control clicked!');
            navigate('/gesture');
          }}
          className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-4 md:p-6 card-hover group relative overflow-hidden shadow-2xl hover:shadow-violet-500/50 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl group-hover:from-white/20 transition-all duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 13.5C14.8 13.8 14.4 14 14 14H10V22H8V16H6V14C6 12.9 6.9 12 8 12H14L19 6.5C19.2 6.2 19.6 6 20 6H21V9Z"/></svg>
              </div>
              <div className="text-white/80 group-hover:text-white transition-colors text-lg md:text-xl">→</div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">Gesture Control</h3>
            <p className="text-white/90 text-xs md:text-sm mb-2 md:mb-3">Motion-based interaction</p>
            <span className="bg-white/20 border border-white/30 px-2 md:px-3 py-1 rounded-full text-white text-xs backdrop-blur-sm">Active</span>
          </div>
        </div>
        
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Health Alerts clicked!');
            navigate('/alerts');
          }}
          className="bg-gradient-to-br from-rose-600 to-pink-700 rounded-3xl p-4 md:p-6 card-hover group relative overflow-hidden shadow-2xl hover:shadow-rose-500/50 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl group-hover:from-white/20 transition-all duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-2c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
              </div>
              <div className="text-white/80 group-hover:text-white transition-colors text-lg md:text-xl">→</div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">Health Alerts</h3>
            <p className="text-white/90 text-xs md:text-sm mb-2 md:mb-3">Fall detection & monitoring</p>
            <span className="bg-white/20 border border-white/30 px-2 md:px-3 py-1 rounded-full text-white text-xs animate-pulse backdrop-blur-sm">1 alert</span>
          </div>
        </div>
        
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Caregiver clicked!');
            navigate('/caregiver');
          }}
          className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-4 md:p-6 card-hover group relative overflow-hidden shadow-2xl hover:shadow-emerald-500/50 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl group-hover:from-white/20 transition-all duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/></svg>
              </div>
              <div className="text-white/80 group-hover:text-white transition-colors text-lg md:text-xl">→</div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">Caregiver</h3>
            <p className="text-white/90 text-xs md:text-sm mb-2 md:mb-3">Remote monitoring</p>
            <span className="bg-white/20 border border-white/30 px-2 md:px-3 py-1 rounded-full text-white text-xs backdrop-blur-sm">2 patients</span>
          </div>
        </div>
        
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Device Setup clicked!');
            navigate('/setup');
          }}
          className="bg-gradient-to-br from-amber-600 to-orange-700 rounded-3xl p-4 md:p-6 card-hover group relative overflow-hidden shadow-2xl hover:shadow-amber-500/50 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl group-hover:from-white/20 transition-all duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/></svg>
              </div>
              <div className="text-white/80 group-hover:text-white transition-colors text-lg md:text-xl">→</div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">Device Setup</h3>
            <p className="text-white/90 text-xs md:text-sm mb-2 md:mb-3">Pair new devices</p>
            <span className="bg-white/20 border border-white/30 px-2 md:px-3 py-1 rounded-full text-white text-xs backdrop-blur-sm">4 available</span>
          </div>
        </div>
        
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Analytics clicked!');
            navigate('/analytics');
          }}
          className="bg-gradient-to-br from-cyan-600 to-sky-700 rounded-3xl p-4 md:p-6 card-hover group relative overflow-hidden shadow-2xl hover:shadow-cyan-500/50 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl group-hover:from-white/20 transition-all duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
              </div>
              <div className="text-white/80 group-hover:text-white transition-colors text-lg md:text-xl">→</div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">Analytics</h3>
            <p className="text-white/90 text-xs md:text-sm mb-2 md:mb-3">Usage & energy data</p>
            <span className="bg-white/20 border border-white/30 px-2 md:px-3 py-1 rounded-full text-white text-xs backdrop-blur-sm">23% saved</span>
          </div>
        </div>
        
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Security clicked!');
            navigate('/security');
          }}
          className="bg-gradient-to-br from-red-600 to-orange-700 rounded-3xl p-4 md:p-6 card-hover group relative overflow-hidden shadow-2xl hover:shadow-red-500/50 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl group-hover:from-white/20 transition-all duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/></svg>
              </div>
              <div className="text-white/80 group-hover:text-white transition-colors text-lg md:text-xl">→</div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">Security</h3>
            <p className="text-white/90 text-xs md:text-sm mb-2 md:mb-3">Face recognition & logs</p>
            <span className="bg-white/20 border border-white/30 px-2 md:px-3 py-1 rounded-full text-white text-xs backdrop-blur-sm">2 registered</span>
          </div>
        </div>
      </div>

      {/* Emergency Access */}
      <div className="bg-gradient-to-r from-red-600 to-rose-700 rounded-3xl p-6 mb-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L15.09 8.26L23 9L15.09 9.74L12 17L8.91 9.74L1 9L8.91 8.26L12 1Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Emergency Access</h3>
              <p className="text-white/90 text-sm">Quick SOS and emergency contacts</p>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Emergency SOS clicked!');
              navigate('/emergency');
            }}
            className="bg-white/20 text-white px-6 py-3 rounded-xl border border-white/30 hover:bg-white/30 transition-all font-medium backdrop-blur-sm cursor-pointer"
          >
            Open SOS
          </button>
        </div>
      </div>

      {/* Voice Control Component */}
      <div className="mb-8">
        <VoiceControl 
          devices={devices}
          onDeviceControl={(command, response) => {
            addActivity('voice', `Voice command: "${command}" - ${response}`);
          }}
        />
      </div>

      {/* Advanced Gesture Control */}
      <div className="mb-8">
        <div className="bg-gray-100 border border-gray-300 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 13.5C14.8 13.8 14.4 14 14 14H10V22H8V16H6V14C6 12.9 6.9 12 8 12H14L19 6.5C19.2 6.2 19.6 6 20 6H21V9Z"/></svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Advanced Gesture Control</h3>
                <p className="text-gray-600">Motion-based device interaction</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/gesture')}
              className="bg-purple-100 border border-purple-300 text-purple-700 px-6 py-3 rounded-xl hover:bg-purple-200 transition-all flex items-center space-x-2 font-medium"
            >
              <span>Open Control</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 transition-all shadow-sm">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83s1.26-1.23 1.3-1.25c.22-.19.49-.29.79-.29.22 0 .42.06.6.16.04.01 4.31 2.46 4.31 2.46V4c0-.83.67-1.5 1.5-1.5S11 3.17 11 4v7h1V1.5c0-.83.67-1.5 1.5-1.5S15 .67 15 1.5V11h1V2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h1V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z"/></svg>
                </div>
                <div>
                  <p className="text-gray-800 font-medium">Wave Control</p>
                  <p className="text-gray-600 text-sm">Control lights with hand waves</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 transition-all shadow-sm">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9l-5.91.74L12 16l-4.09-6.26L2 9l6.91-.74L12 2z"/></svg>
                </div>
                <div>
                  <p className="text-gray-800 font-medium">Point Selection</p>
                  <p className="text-gray-600 text-sm">Point to select devices</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 transition-all shadow-sm">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/></svg>
                </div>
                <div>
                  <p className="text-gray-800 font-medium">Gesture Recognition</p>
                  <p className="text-gray-600 text-sm">AI-powered motion detection</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Recent Activity</h3>
              <p className="text-slate-400 text-sm">Live system events and interactions</p>
            </div>
          </div>
          <button 
            onClick={() => setRecentActivity([])}
            className="bg-gradient-to-r from-slate-600/20 to-slate-700/20 text-slate-300 px-4 py-2 rounded-xl border border-slate-500/30 hover:bg-slate-600/30 transition-all text-sm"
          >
            Clear All
          </button>
        </div>
        
        <div className="space-y-3">
          {recentActivity.length > 0 ? recentActivity.map((activity) => (
            <div key={activity.id} className="bg-white/5 rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform ${
                    activity.type === 'device' ? 'bg-blue-500/20 border border-blue-400/30' :
                    activity.type === 'security' ? 'bg-red-500/20 border border-red-400/30' :
                    activity.type === 'voice' ? 'bg-purple-500/20 border border-purple-400/30' :
                    activity.type === 'gesture' ? 'bg-orange-500/20 border border-orange-400/30' :
                    'bg-green-500/20 border border-green-400/30'
                  }`}>
                    {activity.type === 'device' && <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/></svg>}
                    {activity.type === 'security' && <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/></svg>}
                    {activity.type === 'voice' && <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/></svg>}
                    {activity.type === 'gesture' && <svg className="w-6 h-6 text-orange-400" fill="currentColor" viewBox="0 0 24 24"><path d="M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83s1.26-1.23 1.3-1.25c.22-.19.49-.29.79-.29.22 0 .42.06.6.16.04.01 4.31 2.46 4.31 2.46V4c0-.83.67-1.5 1.5-1.5S11 3.17 11 4v7h1V1.5c0-.83.67-1.5 1.5-1.5S15 .67 15 1.5V11h1V2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h1V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z"/></svg>}
                    {activity.type === 'climate' && <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24"><path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-4-2V5c0-.55.45-1 1-1s1 .45 1 1v6h-2z"/></svg>}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{activity.action}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        activity.type === 'device' ? 'bg-blue-500/20 text-blue-300' :
                        activity.type === 'security' ? 'bg-red-500/20 text-red-300' :
                        activity.type === 'voice' ? 'bg-purple-500/20 text-purple-300' :
                        activity.type === 'gesture' ? 'bg-orange-500/20 text-orange-300' :
                        'bg-green-500/20 text-green-300'
                      }`}>
                        {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                      </span>
                      <p className="text-slate-400 text-sm">{activity.time}</p>
                    </div>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full animate-pulse ${
                  activity.type === 'device' ? 'bg-blue-400' :
                  activity.type === 'security' ? 'bg-red-400' :
                  activity.type === 'voice' ? 'bg-purple-400' :
                  activity.type === 'gesture' ? 'bg-orange-400' :
                  'bg-green-400'
                }`}></div>
              </div>
            </div>
          )) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
              <p className="text-slate-400 text-lg font-medium">No recent activity</p>
              <p className="text-slate-500 text-sm mt-1">System interactions will appear here</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;