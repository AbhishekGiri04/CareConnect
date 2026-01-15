import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import api, { deviceAPI } from '../services/api';
import { database } from '../firebase/config';
import { ref, set } from 'firebase/database';
import GlobalAccessibility from '../components/GlobalAccessibility';
import SafetyStatus from '../components/SafetyStatus';

const GestureControl = () => {
  const { user } = useAuth();
  const { settings, announceToScreenReader } = useAccessibility();
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState('');
  const [gestureCommands, setGestureCommands] = useState([]);
  const [presets, setPresets] = useState({});
  const [sensitivity, setSensitivity] = useState(7);
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [gestureStatus, setGestureStatus] = useState('Click to start gesture control');
  const [isDetecting, setIsDetecting] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  useEffect(() => {
    fetchGestureCommands();
    fetchPresets();
  }, []);
  
  // Enhanced camera functionality
  useEffect(() => {
    if (cameraActive) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            setGestureStatus('Camera active - Show your hand gestures');
            announceToScreenReader('Camera activated. Show hand gestures to control devices.');
          }
        })
        .catch(err => {
          console.error('Camera access denied:', err);
          setCameraActive(false);
          setGestureStatus('Camera access denied. Please allow camera permissions.');
          announceToScreenReader('Camera access denied. Please check browser permissions.');
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
        setGestureStatus('Camera stopped');
      }
    }
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [cameraActive]);

  const fetchGestureCommands = async () => {
    try {
      const response = await api.get('/gesture/commands');
      setGestureCommands(response.data);
    } catch (error) {
      console.error('Error fetching gesture commands:', error);
    }
  };

  const fetchPresets = async () => {
    try {
      const response = await api.get('/gesture/presets');
      setPresets(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching presets:', error);
      setLoading(false);
    }
  };

  // Real-time hand gesture detection with TensorFlow
  const detectHandGestures = async () => {
    if (!videoRef.current || !window.handpose) return;
    
    try {
      const model = await window.handpose.load();
      const predictions = await model.estimateHands(videoRef.current);
      
      if (predictions.length > 0) {
        const hand = predictions[0];
        const fingerCount = countExtendedFingers(hand.landmarks);
        
        if (fingerCount >= 1 && fingerCount <= 4) {
          // Debounce detection
          const now = Date.now();
          if (now - (window.lastGestureTime || 0) > 2000) {
            window.lastGestureTime = now;
            await simulateFingerDetection(fingerCount);
          }
        }
      }
    } catch (error) {
      console.log('TensorFlow detection error:', error);
    }
  };
  
  // Count extended fingers from hand landmarks
  const countExtendedFingers = (landmarks) => {
    if (!landmarks || landmarks.length < 21) return 0;
    
    const fingerTips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
    const fingerPips = [3, 6, 10, 14, 18];
    let count = 0;
    
    // Thumb (check x-coordinate)
    if (landmarks[4][0] > landmarks[3][0]) count++;
    
    // Other fingers (check y-coordinate)
    for (let i = 1; i < 5; i++) {
      if (landmarks[fingerTips[i]][1] < landmarks[fingerPips[i]][1]) {
        count++;
      }
    }
    
    return Math.min(count, 4);
  };
  
  const testGesture = async (gestureName, deviceType, action, fingerCount) => {
    try {
      let message = '';
      
      // Handle finger-based gestures first
      if (fingerCount && fingerCount >= 1 && fingerCount <= 4) {
        const ledRef = ref(database, `LED${fingerCount}`);
        const deviceNames = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom'];
        
        // Toggle the specific LED
        await set(ledRef, 1);
        message = `${fingerCount} finger(s): ${deviceNames[fingerCount-1]} LED activated`;
        
        // Also send to gesture API
        try {
          await api.post('/gesture/devices', {
            deviceId: fingerCount,
            status: true,
            timestamp: Date.now()
          });
        } catch (apiError) {
          console.log('Gesture API not available, using Firebase only');
        }
      }
      // Execute other gesture types via Firebase
      else if (gestureName === 'Wave Right' || action.includes('ON')) {
        await Promise.all([
          set(ref(database, 'LED1'), 1),
          set(ref(database, 'LED2'), 1),
          set(ref(database, 'LED3'), 1),
          set(ref(database, 'LED4'), 1)
        ]);
        message = 'All lights turned ON';
      }
      else if (gestureName === 'Wave Left' || action.includes('OFF')) {
        await Promise.all([
          set(ref(database, 'LED1'), 0),
          set(ref(database, 'LED2'), 0),
          set(ref(database, 'LED3'), 0),
          set(ref(database, 'LED4'), 0)
        ]);
        message = 'All lights turned OFF';
      }
      else if (gestureName === 'Point Up') {
        await set(ref(database, 'FAN1'), 1);
        message = 'Fan turned ON';
      }
      else if (gestureName === 'Point Down') {
        await set(ref(database, 'FAN1'), 0);
        message = 'Fan turned OFF';
      }
      else if (gestureName === 'Fist') {
        await set(ref(database, 'EMERGENCY'), { panic: true, timestamp: Date.now() });
        if (settings.vibrationAlerts && navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
        message = '🚨 Emergency Alert Triggered!';
      }
      else if (gestureName.includes('finger')) {
        const count = parseInt(gestureName.charAt(0));
        const ledRef = ref(database, `LED${count}`);
        await set(ledRef, 1);
        message = `LED ${count} (${['Living Room', 'Bedroom', 'Kitchen', 'Bathroom'][count-1]}) turned ON`;
      }
      
      setDetectedGesture(`${gestureName} - ${message}`);
      
      // Enhanced accessibility feedback
      announceToScreenReader(message);
      
      if (settings.vibrationAlerts && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      console.log(`👋 Gesture executed: ${gestureName} - ${message}`);
      
    } catch (error) {
      console.error('Error testing gesture:', error);
      setDetectedGesture('Error connecting to Firebase');
      announceToScreenReader('Gesture command failed');
    }
  };
  
  // Start TensorFlow-based gesture detection
  const startGestureDetection = async () => {
    setGestureEnabled(true);
    setIsDetecting(true);
    setGestureStatus('Initializing TensorFlow gesture recognition...');
    
    try {
      // Load TensorFlow.js and HandPose model
      if (!window.tf) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }
      
      if (!window.handpose) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose@latest';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }
      
      setGestureStatus('✅ TensorFlow loaded - Starting camera...');
      announceToScreenReader('TensorFlow gesture recognition activated. Camera starting...');
      
      // Auto-start camera
      if (!cameraActive) {
        setCameraActive(true);
      }
      
      // Start real gesture detection loop
      detectionIntervalRef.current = setInterval(async () => {
        if (gestureEnabled && cameraActive && videoRef.current) {
          await detectHandGestures();
        }
      }, 100); // 10 FPS detection
      
      setGestureStatus('👁️ AI watching for hand gestures... Show 1-4 fingers');
      
    } catch (error) {
      console.error('TensorFlow initialization failed:', error);
      setGestureStatus('⚠️ Using fallback mode - Show gestures or use test buttons');
    }
  };
  
  // Stop gesture detection
  const stopGestureDetection = () => {
    setGestureEnabled(false);
    setIsDetecting(false);
    setCameraActive(false);
    setGestureStatus('Gesture control stopped');
    announceToScreenReader('Gesture control deactivated. Camera stopped.');
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
  };
  
  // Enhanced finger detection with TensorFlow integration
  const simulateFingerDetection = async (fingerCount) => {
    if (!gestureEnabled) {
      announceToScreenReader('Please enable gesture control first');
      return;
    }
    
    const gestureName = `${fingerCount} finger${fingerCount > 1 ? 's' : ''}`;
    
    try {
      // Firebase LED control
      const ledRef = ref(database, `LED${fingerCount}`);
      await set(ledRef, 1);
      
      // Device names mapping
      const deviceNames = {
        1: 'Living Room Light',
        2: 'Bedroom Fan', 
        3: 'Kitchen Light',
        4: 'Motion Sensor'
      };
      
      const message = `${fingerCount} finger(s): ${deviceNames[fingerCount]} activated`;
      setDetectedGesture(message);
      announceToScreenReader(message);
      
      // Voice feedback
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
      }
      
      // Vibration feedback
      if (settings.vibrationAlerts && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      setGestureStatus(`✅ ${message}`);
      
      // Send to backend API
      try {
        await api.post('/gesture/process', {
          gestureType: gestureName,
          fingerCount: fingerCount,
          deviceId: fingerCount,
          deviceName: deviceNames[fingerCount],
          timestamp: Date.now()
        });
      } catch (apiError) {
        console.log('Backend API not available, using Firebase only');
      }
      
    } catch (error) {
      console.error('Gesture execution failed:', error);
      setGestureStatus('❌ Gesture failed - Check Firebase connection');
    }
  };

  const createGestureCommand = async (gestureName, deviceType, action) => {
    try {
      await api.post('/gesture/commands', {
        gestureName,
        deviceType,
        action,
        sensitivity: sensitivity * 1000
      });
      fetchGestureCommands();
      alert('Gesture command created successfully!');
    } catch (error) {
      console.error('Error creating gesture command:', error);
      alert('Error creating gesture command');
    }
  };

  const getGesturesForDisability = () => {
    const disabilityType = user?.disability?.type || 'mobility';
    return presets[disabilityType] || [];
  };

  return (
    <div className="min-h-screen relative">
      {/* Gesture Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://w0.peakpx.com/wallpaper/562/780/HD-wallpaper-my-handprint-hand-print.jpg)'
        }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      
      <div className="relative z-10 pt-48 p-4 md:p-6 pb-24" style={{zIndex: 10}}>
        <div className="mb-20"></div>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg p-2">
              <img src="https://img.freepik.com/free-photo/origami-hands-shape_23-2148621007.jpg?semt=ais_hybrid&w=740&q=80" alt="CareConnect Logo" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Hand Gesture Control</h1>
              <p className="text-white/80">Control devices with hand movements</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded-full ${gestureEnabled ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50' : 'bg-red-400'}`}></div>
              <span className="text-white font-medium">{gestureEnabled ? 'Active' : 'Disabled'}</span>
            </div>
            <button 
              onClick={() => setGestureEnabled(!gestureEnabled)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all backdrop-blur-sm shadow-lg ${
                gestureEnabled ? 'bg-red-500/20 text-red-300 border border-red-400/30 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/30'
              }`}
            >
              {gestureEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
        
        {/* Finger Control Guide */}
        <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-white font-semibold">Help</span>
          </div>
          <p className="text-white/80 mb-3">Show 1-4 fingers to toggle LEDs</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">1️⃣</div>
              <p className="text-white text-xs">One finger = Toggle LED 1 (Living Room)</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">2️⃣</div>
              <p className="text-white text-xs">Two fingers = Toggle LED 2 (Bedroom)</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">3️⃣</div>
              <p className="text-white text-xs">Three fingers = Toggle LED 3 (Kitchen)</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">4️⃣</div>
              <p className="text-white text-xs">Four fingers = Toggle LED 4 (Bathroom)</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center space-x-4">
            <button 
              onClick={() => {
                const guideText = 'Gesture Guide: Show 1 finger for Living Room light, 2 fingers for Bedroom light, 3 fingers for Kitchen light, 4 fingers for Bathroom light';
                announceToScreenReader(guideText);
                if (window.speechSynthesis) {
                  const utterance = new SpeechSynthesisUtterance(guideText);
                  utterance.rate = 0.8;
                  window.speechSynthesis.speak(utterance);
                }
              }}
              className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 px-4 py-2 rounded-xl text-sm font-medium border border-blue-400/30 hover:bg-blue-500/30 transition-all"
            >
              🔊 Voice Guide
            </button>
          </div>
          <div className="mt-4 text-center">
            <button 
              onClick={gestureEnabled ? stopGestureDetection : startGestureDetection}
              className={`px-6 py-3 rounded-xl font-medium hover:scale-105 transition-all shadow-lg ${
                gestureEnabled 
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' 
                  : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
              }`}
            >
              {gestureEnabled ? 'Stop Gesture Control' : 'Start Gesture Control'}
            </button>
            <p className="text-white/70 text-sm mt-2">{gestureStatus}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white/95 backdrop-blur-xl border border-gray-300 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Live Camera Feed</h3>
            </div>
            <button
              onClick={() => {
                const newState = !cameraActive;
                setCameraActive(newState);
                announceToScreenReader(newState ? 'Starting camera' : 'Stopping camera');
              }}
              className={`px-4 py-2 rounded-xl font-medium transition-all border ${
                cameraActive ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' : 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
              }`}
            >
              {cameraActive ? '⏹️ Stop Camera' : '▶️ Start Camera'}
            </button>
          </div>
          
          <div className="bg-gray-100 rounded-2xl h-64 flex items-center justify-center border border-gray-300 relative overflow-hidden">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded-2xl"
                  onLoadedMetadata={() => {
                    console.log('Camera loaded successfully');
                    setGestureStatus('Camera ready - Show hand gestures');
                  }}
                  onError={(e) => {
                    console.error('Video error:', e);
                    setGestureStatus('Camera error - Please refresh and try again');
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ display: 'none' }}
                />
                {/* Camera overlay */}
                <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                  🔴 LIVE
                </div>
                <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  Show 1-4 fingers
                </div>
              </>
            ) : (
              <div className="text-center relative z-10">
                <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                </div>
                <p className="text-gray-700 font-medium">Click 'Start Camera' to begin</p>
                <p className="text-gray-500 text-sm mt-1">Webcam will show here</p>
                <button
                  onClick={() => setCameraActive(true)}
                  className="mt-3 bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-medium border border-green-300 hover:bg-green-200 transition-all"
                >
                  ▶️ Start Camera
                </button>
              </div>
            )}
          </div>
          
          <div className="mt-4 space-y-3">
            {detectedGesture && (
              <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <p className="text-emerald-700 font-semibold">Last Action: {detectedGesture}</p>
                </div>
              </div>
            )}
            
            {/* Quick Test Buttons */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-800 font-medium">Quick Test (Simulate Detection):</p>
                <button
                  onClick={() => {
                    const testGuide = 'Use these buttons to test gesture commands. Button 1 controls Living Room, Button 2 controls Bedroom, Button 3 controls Kitchen, Button 4 controls Bathroom.';
                    announceToScreenReader(testGuide);
                    if (window.speechSynthesis) {
                      const utterance = new SpeechSynthesisUtterance(testGuide);
                      utterance.rate = 0.8;
                      window.speechSynthesis.speak(utterance);
                    }
                  }}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-medium border border-blue-300 hover:bg-blue-200 transition-all"
                >
                  🔊 Test Guide
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { count: 1, name: 'Living Room', emoji: '🛋️' },
                  { count: 2, name: 'Bedroom', emoji: '🛌' },
                  { count: 3, name: 'Kitchen', emoji: '🍳' },
                  { count: 4, name: 'Bathroom', emoji: '🚿' }
                ].map(({ count, name, emoji }) => (
                  <button
                    key={count}
                    onClick={() => simulateFingerDetection(count)}
                    className="bg-blue-100 text-blue-800 py-3 px-2 rounded-lg text-xs font-medium border border-blue-300 hover:bg-blue-200 transition-all flex flex-col items-center space-y-1"
                    title={`Test ${count} finger${count > 1 ? 's' : ''} gesture - ${name}`}
                  >
                    <span className="text-lg">{count} 🚨</span>
                    <span className="text-xs">{emoji} {name}</span>
                  </button>
                ))}
              </div>
              
              {/* Device Status Display */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[
                  { id: 1, name: 'Living Room', color: 'emerald' },
                  { id: 2, name: 'Bedroom', color: 'blue' },
                  { id: 3, name: 'Kitchen', color: 'orange' },
                  { id: 4, name: 'Bathroom', color: 'purple' }
                ].map(({ id, name, color }) => (
                  <div key={id} className="bg-white border border-gray-300 rounded-lg p-2 text-center shadow-sm">
                    <div className={`w-3 h-3 bg-${color}-400 rounded-full mx-auto mb-1 opacity-50`}></div>
                    <p className={`text-${color}-700 text-xs font-medium`}>{name}</p>
                    <p className={`text-${color}-600 text-xs`}>LED {id}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-100 border border-gray-300 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/></svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Advanced Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-800 font-medium flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9l-5.91.74L12 16l-4.09-6.26L2 9l6.91-.74L12 2z"/></svg>
                  <span>Sensitivity</span>
                </span>
                <span className="text-blue-700 text-sm font-semibold px-2 py-1 bg-blue-200 rounded">
                  {sensitivity <= 3 ? 'Low' : sensitivity <= 7 ? 'Medium' : 'High'}
                </span>
              </div>
              <input 
                type="range" 
                className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer" 
                min="1" 
                max="10" 
                value={sensitivity}
                onChange={(e) => {
                  setSensitivity(parseInt(e.target.value));
                  announceToScreenReader(`Sensitivity set to ${parseInt(e.target.value) <= 3 ? 'low' : parseInt(e.target.value) <= 7 ? 'medium' : 'high'}`);
                }}
              />
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <label className="text-gray-800 font-medium mb-3 block flex items-center space-x-2">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <span>Detection Range</span>
              </label>
              <select 
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:border-green-500 transition-colors"
                onChange={(e) => announceToScreenReader(`Detection range set to ${e.target.value}`)}
              >
                <option>1-3 feet</option>
                <option>3-6 feet</option>
                <option>6-10 feet</option>
              </select>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <label className="text-gray-800 font-medium mb-3 block flex items-center space-x-2">
                <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                <span>Response Time</span>
              </label>
              <select 
                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:border-orange-500 transition-colors"
                onChange={(e) => announceToScreenReader(`Response time set to ${e.target.value}`)}
              >
                <option>Instant</option>
                <option>1 second</option>
                <option>2 seconds</option>
              </select>
            </div>
            
            {/* Enhanced Real-time Status */}
            <div className="bg-gray-200 border border-gray-400 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded-full ${gestureEnabled && cameraActive ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-red-500'}`}></div>
                  <span className="text-gray-800 font-semibold">AI Gesture System</span>
                </div>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${gestureEnabled && cameraActive ? 'text-green-700 bg-green-200' : 'text-red-700 bg-red-200'}`}>
                  {gestureEnabled && cameraActive ? '🟢 ACTIVE' : '🔴 INACTIVE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white rounded p-2 border border-gray-300">
                  <span className="text-gray-600">Firebase:</span>
                  <span className="text-emerald-700 font-medium ml-1">Connected</span>
                </div>
                <div className="bg-white rounded p-2 border border-gray-300">
                  <span className="text-gray-600">Camera:</span>
                  <span className={`font-medium ml-1 ${cameraActive ? 'text-blue-700' : 'text-red-700'}`}>
                    {cameraActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="bg-white rounded p-2 border border-gray-300">
                  <span className="text-gray-600">TensorFlow:</span>
                  <span className="text-purple-700 font-medium ml-1">Ready</span>
                </div>
                <div className="bg-white rounded p-2 border border-gray-300">
                  <span className="text-gray-600">Detection:</span>
                  <span className={`font-medium ml-1 ${gestureEnabled ? 'text-orange-700' : 'text-gray-500'}`}>
                    {gestureEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      </div>
    </div>
  );
};

export default GestureControl;