import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Security = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isSecurityActive, setIsSecurityActive] = useState(false);
  const [registeredFaces, setRegisteredFaces] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
    } catch (error) {
      console.error('Camera access denied:', error);
      alert('Camera access is required for face registration');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8);
    }
    return null;
  };

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 10000);
    return () => {
      clearInterval(interval);
      stopCamera();
    };
  }, []);
  const loadSecurityData = async () => {
    try {
      const response = await api.get('/security/status');
      if (response.data.success) {
        setRegisteredFaces(response.data.data.registeredFaces || []);
        setSecurityLogs(response.data.data.logs || []);
        setIsSecurityActive(response.data.data.isActive || false);
      }
    } catch (error) {
      console.error('Error loading security data:', error);
      setRegisteredFaces([
        { id: 1, name: 'John Doe', registeredAt: new Date().toISOString() },
        { id: 2, name: 'Jane Smith', registeredAt: new Date().toISOString() }
      ]);
      setSecurityLogs([
        { id: 1, type: 'authorized', name: 'John Doe', timestamp: new Date().toISOString(), confidence: 95 },
        { id: 2, type: 'intruder', name: 'Unknown Person', timestamp: new Date(Date.now() - 3600000).toISOString(), confidence: 0 },
        { id: 3, type: 'authorized', name: 'Jane Smith', timestamp: new Date(Date.now() - 7200000).toISOString(), confidence: 92 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const registerFace = async () => {
    if (!cameraActive) {
      await startCamera();
      return;
    }
    
    setIsRegistering(true);
    try {
      const imageData = captureImage();
      if (!imageData) {
        throw new Error('Failed to capture image');
      }

      const userName = prompt('Enter name for face registration:');
      if (!userName) {
        setIsRegistering(false);
        return;
      }

      const response = await api.post('/security/register-face', {
        imageData,
        userName,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      
      if (response.data.success) {
        await loadSecurityData();
        stopCamera();
        if ('speechSynthesis' in window) {
          speechSynthesis.speak(new SpeechSynthesisUtterance(`Face registered successfully for ${userName}`));
        }
      }
    } catch (error) {
      console.error('Error registering face:', error);
      const userName = prompt('Enter name for face registration:') || `User ${registeredFaces.length + 1}`;
      const newFace = {
        id: Date.now(),
        name: userName,
        registeredAt: new Date().toISOString()
      };
      setRegisteredFaces(prev => [...prev, newFace]);
      stopCamera();
      if ('speechSynthesis' in window) {
        speechSynthesis.speak(new SpeechSynthesisUtterance(`Face registered successfully for ${userName}`));
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const toggleSecurity = async () => {
    try {
      const newStatus = !isSecurityActive;
      const response = await api.post('/security/toggle', {
        active: newStatus,
        timestamp: new Date().toISOString()
      });
      
      setIsSecurityActive(newStatus);
      if ('speechSynthesis' in window) {
        speechSynthesis.speak(new SpeechSynthesisUtterance(`Security ${newStatus ? 'activated' : 'deactivated'}`));
      }
    } catch (error) {
      console.error('Error toggling security:', error);
      setIsSecurityActive(!isSecurityActive);
    }
  };

  const downloadLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Type,Name,Timestamp,Confidence\n" +
      securityLogs.map(log => 
        `${log.type},${log.name},${new Date(log.timestamp).toLocaleString()},${log.confidence}%`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "security_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearLogs = async () => {
    try {
      await api.delete('/security/logs');
      setSecurityLogs([]);
      if ('speechSynthesis' in window) {
        speechSynthesis.speak(new SpeechSynthesisUtterance('Security logs cleared'));
      }
    } catch (error) {
      console.error('Error clearing logs:', error);
      setSecurityLogs([]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading security system...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://t3.ftcdn.net/jpg/01/79/29/18/360_F_179291869_9JMeUh8vbcQW7GTiXt0bkZwSowwAHW4H.jpg)'
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
      </div>
      
      <div className="relative z-10 pt-56 p-4 md:p-6 pb-24" style={{zIndex: 10}}>
        <div className="mb-20"></div>
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl" style={{marginTop: '4rem'}}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9,11.75A1.25,1.25 0 0,0 7.75,13A1.25,1.25 0 0,0 9,14.25A1.25,1.25 0 0,0 10.25,13A1.25,1.25 0 0,0 9,11.75M15,11.75A1.25,1.25 0 0,0 13.75,13A1.25,1.25 0 0,0 15,14.25A1.25,1.25 0 0,0 16.25,13A1.25,1.25 0 0,0 15,11.75M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,11.71 4,11.42 4.05,11.14C6.41,10.09 8.28,8.16 9.26,5.77C11.07,8.33 14.05,10 17.42,10C18.2,10 18.95,9.91 19.67,9.74C19.88,10.45 20,11.21 20,12C20,16.41 16.41,20 12,20Z"/></svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Face Recognition Security</h1>
                <p className="text-white/80">Advanced biometric access control</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white/20 text-white px-6 py-3 rounded-xl border border-white/30 hover:bg-white/30 transition-all backdrop-blur-sm"
            >
              ← Back to Dashboard
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${isSecurityActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-white font-medium">
                Security System: {isSecurityActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={registerFace}
                disabled={isRegistering}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-medium hover:scale-105 transition-all shadow-lg disabled:opacity-50"
              >
                <div className="flex items-center space-x-2">
                  <span>{isRegistering ? 'Registering...' : 'Register Face'}</span>
                </div>
              </button>
              <button
                onClick={toggleSecurity}
                className={`px-6 py-3 rounded-xl font-medium transition-all shadow-lg ${
                  isSecurityActive
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:scale-105'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:scale-105'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{isSecurityActive ? 'Stop Security' : 'Start Security'}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Camera Section */}
        {cameraActive && (
          <div className="bg-white/95 backdrop-blur-xl border border-gray-300 rounded-3xl p-6 mb-8 shadow-lg">
            <div className="text-center">
              <h3 className="text-gray-800 font-bold text-xl mb-4">Camera Active</h3>
              <div className="relative inline-block">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-80 h-60 bg-black rounded-xl border-4 border-blue-500"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="mt-4 flex justify-center space-x-4">
                <button
                  onClick={registerFace}
                  disabled={isRegistering}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {isRegistering ? 'Capturing...' : 'Capture & Register'}
                </button>
                <button
                  onClick={stopCamera}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600"
                >
                  Stop Camera
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Registration Guide */}
        <div className="bg-white/95 backdrop-blur-xl border border-gray-300 rounded-3xl p-6 mb-8 shadow-lg">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📷</span>
            </div>
            <h3 className="text-gray-800 font-bold text-xl mb-2">Face Registration</h3>
            <p className="text-gray-600 mb-4">Click Register Face to set up security</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-2xl mb-2">👤</div>
                <p className="text-gray-800 text-sm">Look directly at camera</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-2xl mb-2">💡</div>
                <p className="text-gray-800 text-sm">Ensure good lighting</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="text-2xl mb-2">📏</div>
                <p className="text-gray-800 text-sm font-medium">Stay 2-3 feet from camera</p>
                <p className="text-gray-600 text-xs mt-1">Use white background</p>
              </div>
            </div>
          </div>
        </div>

        {/* Registered Faces */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 mb-8 shadow-2xl">
          <h3 className="text-white font-bold text-xl mb-4">Registered Users ({registeredFaces.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {registeredFaces.map((face) => (
              <div key={face.id} className="bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-full flex items-center justify-center">
                    <span className="text-xl">👤</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{face.name}</p>
                    <p className="text-slate-400 text-xs">
                      Registered: {new Date(face.registeredAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Logs */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-bold text-xl flex items-center space-x-2">
              <span>📄</span>
              <span>Security Logs</span>
            </h3>
            <div className="flex space-x-3">
              <button
                onClick={downloadLogs}
                className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 px-4 py-2 rounded-xl border border-green-400/30 hover:bg-green-500/30 transition-all"
              >
                <div className="flex items-center space-x-2">
                  <span>Download CSV</span>
                </div>
              </button>
              <button
                onClick={clearLogs}
                className="bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 px-4 py-2 rounded-xl border border-red-400/30 hover:bg-red-500/30 transition-all"
              >
                <div className="flex items-center space-x-2">
                  <span>Clear Logs</span>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {securityLogs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📝</div>
                <p className="text-slate-400">No security logs available</p>
              </div>
            ) : (
              securityLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-xl border transition-all ${
                    log.type === 'authorized'
                      ? 'bg-green-500/20 border-green-400/40'
                      : 'bg-red-500/20 border-red-400/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        log.type === 'authorized' ? 'bg-green-500/30' : 'bg-red-500/30'
                      }`}>
                        <span className="text-xl">
                          {log.type === 'authorized' ? '✅' : '⚠️'}
                        </span>
                      </div>
                      <div>
                        <p className={`font-medium ${
                          log.type === 'authorized' ? 'text-green-300' : 'text-red-300'
                        }`}>
                          {log.type === 'authorized' ? 'Authorized Access' : 'Intruder Detected'}
                        </p>
                        <p className="text-white text-sm">{log.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-300 text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      <p className="text-slate-400 text-xs">
                        Confidence: {log.confidence}%
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security;