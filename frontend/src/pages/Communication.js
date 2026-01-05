import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Communication = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brailleText, setBrailleText] = useState('');
  const [signRecognition, setSignRecognition] = useState(false);
  const [detectedSign, setDetectedSign] = useState('None');
  const [messageHistory, setMessageHistory] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [signHistory, setSignHistory] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
    }
  }, []);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setBrailleText('');
  };

  const translateBraille = async () => {
    try {
      const response = await api.post('/communication/braille-translate', {
        canvas: canvasRef.current.toDataURL()
      });
      if (response.data.success) {
        setBrailleText(response.data.text);
        if ('speechSynthesis' in window) {
          speechSynthesis.speak(new SpeechSynthesisUtterance(response.data.text));
        }
      }
    } catch (error) {
      setBrailleText('Sample translated text from Braille pattern');
    }
  };

  const startSignRecognition = async () => {
    setSignRecognition(!signRecognition);
    if (!signRecognition) {
      try {
        const response = await api.post('/communication/sign-recognition', { action: 'start' });
        if (response.data.success) {
          setDetectedSign('Listening...');
          // Simulate sign detection
          setTimeout(() => {
            const signs = ['Hello', 'Thank you', 'Help', 'OK', 'Emergency'];
            const randomSign = signs[Math.floor(Math.random() * signs.length)];
            setDetectedSign(randomSign);
            setSignHistory(prev => [...prev, { sign: randomSign, timestamp: new Date().toLocaleTimeString() }]);
          }, 3000);
        }
      } catch (error) {
        setDetectedSign('Recognition started');
      }
    } else {
      setDetectedSign('None');
    }
  };

  const sendMessage = async () => {
    if (currentMessage.trim()) {
      const newMessage = {
        id: Date.now(),
        text: currentMessage,
        timestamp: new Date().toLocaleTimeString(),
        type: 'user'
      };
      
      setMessageHistory(prev => [...prev, newMessage]);
      
      try {
        await api.post('/communication/send-message', { message: currentMessage });
      } catch (error) {
        console.error('Message send error:', error);
      }
      
      setCurrentMessage('');
      
      if ('speechSynthesis' in window) {
        speechSynthesis.speak(new SpeechSynthesisUtterance(currentMessage));
      }
    }
  };

  const sendQuickPhrase = async (phrase) => {
    const newMessage = {
      id: Date.now(),
      text: phrase,
      timestamp: new Date().toLocaleTimeString(),
      type: 'quick'
    };
    
    setMessageHistory(prev => [...prev, newMessage]);
    
    try {
      await api.post('/communication/quick-phrase', { phrase });
    } catch (error) {
      console.error('Quick phrase error:', error);
    }
    
    if ('speechSynthesis' in window) {
      speechSynthesis.speak(new SpeechSynthesisUtterance(phrase));
    }
  };

  const clearHistory = (type) => {
    if (type === 'messages') {
      setMessageHistory([]);
    } else if (type === 'signs') {
      setSignHistory([]);
    }
  };

  const downloadHistory = () => {
    const data = messageHistory.map(msg => `${msg.timestamp}: ${msg.text}`).join('\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'communication_history.txt';
    a.click();
  };

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://img.freepik.com/premium-photo/group-speech-bubbles-vibrant-blue-background-ideal-communication-concepts_153912-38048.jpg)'
        }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      
      <div className="relative z-10 pt-56 p-4 md:p-6 pb-24" style={{zIndex: 10}}>
        <div className="mb-20"></div>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl" style={{marginTop: '4rem'}}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">💬</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Communication Board</h1>
                <p className="text-white/80">Accessible communication tools for all users</p>
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

        {/* Braille Drawing */}
        <div className="bg-white/95 backdrop-blur-xl border border-gray-300 rounded-3xl p-6 mb-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
              <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/></svg>
              <span>Braille Drawing (For Blind Users)</span>
            </h3>
            <div className="flex space-x-3">
              <button
                onClick={translateBraille}
                className="bg-green-100 text-green-700 px-4 py-2 rounded-xl border border-green-300 hover:bg-green-200 transition-all font-medium"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                  <span>Translate to English</span>
                </div>
              </button>
              <button
                onClick={clearCanvas}
                className="bg-red-100 text-red-700 px-4 py-2 rounded-xl border border-red-300 hover:bg-red-200 transition-all font-medium"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  <span>Clear</span>
                </div>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="bg-gray-100 rounded-2xl p-4 border border-gray-300 mb-4">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={300}
                  className="w-full bg-white rounded-xl cursor-crosshair border border-gray-200"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
              <button
                className="w-full bg-blue-100 text-blue-700 py-3 rounded-xl border border-blue-300 hover:bg-blue-200 transition-all font-medium"
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  <span>Start Drawing</span>
                </div>
              </button>
            </div>
            
            <div>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 h-full">
                <h4 className="text-gray-800 font-medium mb-3">Instructions:</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Draw Braille patterns with your finger or mouse. Each dot pattern will be recognized.
                </p>
                {brailleText && (
                  <div className="bg-green-100 border border-green-300 rounded-xl p-3">
                    <p className="text-green-700 font-medium">Translated Text:</p>
                    <p className="text-gray-800">{brailleText}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sign Language Recognition */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 mb-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white flex items-center space-x-2">
              <span>🤟</span>
              <span>Sign Language Recognition (For Deaf Users)</span>
            </h3>
            <div className="flex space-x-3">
              <button
                onClick={startSignRecognition}
                className={`px-4 py-2 rounded-xl border transition-all ${
                  signRecognition
                    ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 border-red-400/30'
                    : 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-400/30'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>📹</span>
                  <span>{signRecognition ? 'Stop Recognition' : 'Start Sign Recognition'}</span>
                </div>
              </button>
              <button
                onClick={() => clearHistory('signs')}
                className="bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 px-4 py-2 rounded-xl border border-red-400/30 hover:bg-red-500/30 transition-all"
              >
                <div className="flex items-center space-x-2">
                  <span>🗑️</span>
                  <span>Clear History</span>
                </div>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
              <div className="bg-black/50 rounded-xl h-48 flex items-center justify-center mb-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">📹</div>
                  <p className="text-white/70">Click Start to begin sign language recognition</p>
                </div>
              </div>
              <div className="bg-blue-500/20 border border-blue-400/40 rounded-xl p-3">
                <p className="text-blue-300 font-medium">Detected: {detectedSign}</p>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
              <h4 className="text-white font-medium mb-3">Recognition History:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {signHistory.length > 0 ? signHistory.map((item, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-2">
                    <div className="flex justify-between">
                      <span className="text-white">{item.sign}</span>
                      <span className="text-slate-400 text-xs">{item.timestamp}</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-slate-400 text-sm">No signs detected yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Message History & Quick Phrases */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message History */}
          <div className="bg-gradient-to-br from-blue-900/80 to-indigo-900/90 backdrop-blur-xl border border-blue-700/50 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center space-x-2">
                <svg className="w-6 h-6 text-blue-300" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                <span>Message History</span>
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={downloadHistory}
                  className="bg-green-600/30 text-green-300 px-3 py-2 rounded-xl border border-green-500/40 hover:bg-green-600/40 transition-all text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                </button>
                <button
                  onClick={() => clearHistory('messages')}
                  className="bg-red-600/30 text-red-300 px-3 py-2 rounded-xl border border-red-500/40 hover:bg-red-600/40 transition-all text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </div>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {messageHistory.length > 0 ? messageHistory.map((msg) => (
                <div key={msg.id} className={`p-3 rounded-xl ${
                  msg.type === 'quick' ? 'bg-blue-600/30 border border-blue-500/50' : 'bg-indigo-700/40 border border-indigo-600/50'
                }`}>
                  <div className="flex justify-between">
                    <span className="text-white">{msg.text}</span>
                    <span className="text-blue-300 text-xs">{msg.timestamp}</span>
                  </div>
                </div>
              )) : (
                <p className="text-blue-300 text-center py-8">No messages yet</p>
              )}
            </div>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type message manually..."
                className="flex-1 bg-blue-800/40 border border-blue-600/50 rounded-xl px-4 py-2 text-white placeholder-blue-300/70 focus:border-blue-500 focus:outline-none"
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="bg-blue-600/40 text-blue-300 px-4 py-2 rounded-xl border border-blue-500/50 hover:bg-blue-600/50 transition-all"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>

          {/* Quick Phrases */}
          <div className="bg-gradient-to-br from-purple-900/80 to-violet-900/90 backdrop-blur-xl border border-purple-700/50 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
              <svg className="w-6 h-6 text-purple-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9l-5.91.74L12 16l-4.09-6.26L2 9l6.91-.74L12 2z"/></svg>
              <span>Quick Phrases</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {['Help', 'Call Family', "I'm OK", 'Emergency'].map((phrase) => (
                <button
                  key={phrase}
                  onClick={() => sendQuickPhrase(phrase)}
                  className="bg-purple-700/40 text-purple-200 p-4 rounded-xl border border-purple-600/50 hover:bg-purple-700/50 transition-all font-medium hover:scale-105 transform"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Communication;