import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const HackathonDemo = () => {
  const { connected, deviceStatus, alerts, emitDeviceCommand, emitEmergency } = useSocket();
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [gestureMode, setGestureMode] = useState(false);
  const [demoMode, setDemoMode] = useState('voice');

  // Voice Recognition Setup
  const startVoiceControl = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onstart = () => setVoiceEnabled(true);
      recognition.onend = () => setVoiceEnabled(false);
      
      recognition.onresult = async (event) => {
        const command = event.results[0][0].transcript.toLowerCase();
        console.log('Voice command:', command);
        
        try {
          const response = await api.post('/voice/process', { command });
          if (response.data.success && response.data.audioResponse) {
            speak(response.data.message);
          }
        } catch (error) {
          console.error('Voice command error:', error);
        }
      };
      
      recognition.start();
    }
  };

  // Text-to-Speech for accessibility
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  // Gesture Simulation (keyboard shortcuts for demo)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!gestureMode) return;
      
      switch (e.key.toLowerCase()) {
        case 'l':
          toggleDevice('light');
          speak('Light toggled');
          break;
        case 'f':
          toggleDevice('fan');
          speak('Fan toggled');
          break;
        case 'e':
          triggerEmergency();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gestureMode]);

  const toggleDevice = async (device) => {
    try {
      await api.post(`/devices/toggle`, { device });
      emitDeviceCommand(device, 'toggle');
    } catch (error) {
      console.error('Device toggle error:', error);
    }
  };

  const triggerEmergency = () => {
    const emergencyData = {
      type: 'manual',
      message: 'Emergency triggered from demo interface',
      location: 'Demo Room',
      timestamp: Date.now()
    };
    
    emitEmergency(emergencyData);
    speak('Emergency alert sent');
  };

  const simulateFall = async () => {
    try {
      await api.post('/health/fall-detected', {
        deviceId: 'demo_health_band',
        userId: 'demo_user',
        location: 'Living Room'
      });
      speak('Fall detection simulated');
    } catch (error) {
      console.error('Fall simulation error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🏠 SmartAssist Home - Hackathon Demo
          </h1>
          <p className="text-gray-600 text-lg">
            IoT for Accessibility - Voice, Gesture & Emergency Systems
          </p>
          <div className="flex items-center justify-center space-x-4 mt-4">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        {/* Demo Mode Selector */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Demo Modes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'voice', name: 'Voice Control', icon: '🎤', desc: 'Hands-free operation' },
              { id: 'gesture', name: 'Gesture Control', icon: '👋', desc: 'Motion-based control' },
              { id: 'emergency', name: 'Emergency System', icon: '🚨', desc: 'Fall detection & alerts' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setDemoMode(mode.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  demoMode === mode.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">{mode.icon}</div>
                <h3 className="font-semibold text-gray-800">{mode.name}</h3>
                <p className="text-sm text-gray-600">{mode.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Control Demo */}
        {demoMode === 'voice' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">🎤 Voice Control Demo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <button
                  onClick={startVoiceControl}
                  className={`w-full p-6 rounded-xl text-white font-semibold text-lg transition-all ${
                    voiceEnabled 
                      ? 'bg-red-500 animate-pulse' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {voiceEnabled ? '🎤 Listening...' : '🎙️ Start Voice Control'}
                </button>
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <h4 className="font-semibold mb-2">Try saying:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• "Turn on the lights"</li>
                    <li>• "Turn off the fan"</li>
                    <li>• "Emergency help"</li>
                    <li>• "What's my status?"</li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold">Device Status:</h4>
                {Object.entries(deviceStatus).map(([deviceId, status]) => (
                  <div key={deviceId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{deviceId}</span>
                    <div className={`w-3 h-3 rounded-full ${status?.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Gesture Control Demo */}
        {demoMode === 'gesture' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">👋 Gesture Control Demo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <button
                  onClick={() => setGestureMode(!gestureMode)}
                  className={`w-full p-6 rounded-xl text-white font-semibold text-lg transition-all ${
                    gestureMode 
                      ? 'bg-green-500' 
                      : 'bg-gray-500 hover:bg-gray-600'
                  }`}
                >
                  {gestureMode ? '✋ Gesture Mode ON' : '👋 Enable Gesture Mode'}
                </button>
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <h4 className="font-semibold mb-2">Keyboard Shortcuts (Demo):</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Press <kbd className="bg-gray-200 px-2 py-1 rounded">L</kbd> - Toggle Light</li>
                    <li>• Press <kbd className="bg-gray-200 px-2 py-1 rounded">F</kbd> - Toggle Fan</li>
                    <li>• Press <kbd className="bg-gray-200 px-2 py-1 rounded">E</kbd> - Emergency</li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold">Quick Controls:</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => toggleDevice('light')}
                    className="p-4 bg-yellow-100 hover:bg-yellow-200 rounded-xl text-center transition-colors"
                  >
                    <div className="text-2xl mb-1">💡</div>
                    <div className="text-sm font-medium">Light</div>
                  </button>
                  <button
                    onClick={() => toggleDevice('fan')}
                    className="p-4 bg-blue-100 hover:bg-blue-200 rounded-xl text-center transition-colors"
                  >
                    <div className="text-2xl mb-1">🌀</div>
                    <div className="text-sm font-medium">Fan</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Emergency System Demo */}
        {demoMode === 'emergency' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">🚨 Emergency System Demo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <button
                  onClick={triggerEmergency}
                  className="w-full p-6 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-lg transition-colors"
                >
                  🆘 Trigger Emergency Alert
                </button>
                <button
                  onClick={simulateFall}
                  className="w-full p-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-lg transition-colors"
                >
                  🚨 Simulate Fall Detection
                </button>
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <h4 className="font-semibold text-red-800 mb-2">Emergency Features:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Automatic fall detection</li>
                    <li>• Caregiver notifications</li>
                    <li>• Voice-activated SOS</li>
                    <li>• Health monitoring alerts</li>
                  </ul>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Recent Alerts:</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alerts.slice(0, 5).map((alert, index) => (
                    <div key={index} className={`p-3 rounded-lg border-l-4 ${
                      alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                      alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                      'bg-yellow-50 border-yellow-500'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {alert.type === 'fall_detection' ? '🚨' :
                           alert.type === 'emergency' ? '🆘' : '⚠️'}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Accessibility Features */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">♿ Accessibility Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">🦽 Mobility Impaired</h3>
              <ul className="text-sm space-y-1 opacity-90">
                <li>• Voice control</li>
                <li>• Gesture recognition</li>
                <li>• Large buttons</li>
                <li>• Remote access</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">👁️ Visually Impaired</h3>
              <ul className="text-sm space-y-1 opacity-90">
                <li>• Audio feedback</li>
                <li>• High contrast</li>
                <li>• Screen reader support</li>
                <li>• Voice navigation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🧠 Cognitive Impairment</h3>
              <ul className="text-sm space-y-1 opacity-90">
                <li>• Simple interface</li>
                <li>• Fall detection</li>
                <li>• Caregiver alerts</li>
                <li>• Emergency button</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HackathonDemo;